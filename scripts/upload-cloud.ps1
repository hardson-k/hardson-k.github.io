<#
.SYNOPSIS
    一键上传文件到云文档库（uploads 目录）。

.DESCRIPTION
    把指定文件复制到仓库 uploads/ 目录，自动提交并推送到 GitHub。
    推送完成后，站点的云文档页面（html/cloudfiles.html）即可看到该文件。
    使用本机 Git 已保存的凭据，脚本本身不存储任何令牌。

.EXAMPLE
    .\scripts\upload-cloud.ps1 -Path "D:\资料\讲义.pdf"
    上传单个文件。

.EXAMPLE
    .\scripts\upload-cloud.ps1 -Path "D:\资料\*.docx"
    按通配符批量上传。

.EXAMPLE
    .\scripts\upload-cloud.ps1 -Path "D:\资料" -Recurse
    上传整个文件夹内的文件。

.EXAMPLE
    .\scripts\upload-cloud.ps1 -List
    只查看当前库里有什么，不做任何修改。

.NOTES
    仓库为公开仓库，上传即公开。请勿上传涉密或个人敏感材料。
    单文件超过 25 MB 会给出警告（GitHub 硬上限 100 MB）。
#>
[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [string]$Path,

    # 连同子目录一起上传（配合 -Path 指向目录时使用）
    [switch]$Recurse,

    # 只列出当前文件清单，不做改动
    [switch]$List,

    # 自定义提交说明
    [string]$Message,

    # 只复制到 uploads，不提交不推送，留给你自己检查
    [switch]$NoPush
)

$ErrorActionPreference = 'Stop'

# ---- 定位仓库根目录（脚本位于 scripts/ 下，上一级即根目录）----
$RepoRoot = Split-Path -Parent $PSScriptRoot
$UploadDir = Join-Path $RepoRoot 'uploads'

if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot '.git'))) {
    throw "未找到 git 仓库：$RepoRoot"
}
if (-not (Test-Path -LiteralPath $UploadDir)) {
    New-Item -ItemType Directory -Path $UploadDir | Out-Null
}

function Write-Git {
    param([string[]]$Cmd, [string[]]$Args_)
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $out = & git -C $RepoRoot $Cmd @Args_ 2>&1
    $code = $LASTEXITCODE
    $ErrorActionPreference = $prev
    if ($code -ne 0) {
        throw "git $($Cmd -join ' ') 失败：$($out -join ' ')"
    }
    return $out
}

# ---- 仅列出模式 ----
if ($List) {
    Write-Host "`n云文档库：$UploadDir`n" -ForegroundColor Cyan
    $items = Get-ChildItem -LiteralPath $UploadDir -File | Where-Object { $_.Name -ne 'README.md' }
    if (-not $items) {
        Write-Host "（空）" -ForegroundColor Yellow
        return
    }
    $items |
        Sort-Object Name |
        Select-Object Name,
            @{ n = '大小'; e = { if ($_.Length -lt 1KB) { "$($_.Length) B" } elseif ($_.Length -lt 1MB) { "{0:N1} KB" -f ($_.Length / 1KB) } else { "{0:N2} MB" -f ($_.Length / 1MB) } } },
            @{ n = '修改时间'; e = { $_.LastWriteTime.ToString('yyyy-MM-dd HH:mm') } } |
        Format-Table -AutoSize |
        Out-String -Width 120 |
        Write-Host
    return
}

if ([string]::IsNullOrWhiteSpace($Path)) {
    Write-Host @"

云文档上传脚本

用法：
  .\scripts\upload-cloud.ps1 -Path "文件路径"            上传文件
  .\scripts\upload-cloud.ps1 -Path "目录" -Recurse       上传整个目录
  .\scripts\upload-cloud.ps1 -List                       查看现有文件

提示：仓库是公开的，上传即公开，请勿上传涉密材料。

"@ -ForegroundColor Cyan
    return
}

# ---- 收集待上传文件 ----
$targets = @()
if (Test-Path -LiteralPath $Path -PathType Leaf) {
    $targets = @(Get-Item -LiteralPath $Path)
}
elseif (Test-Path -LiteralPath $Path -PathType Container) {
    $leaf = if ($Recurse) {
        Get-ChildItem -LiteralPath $Path -File -Recurse -Force
    } else {
        Get-ChildItem -LiteralPath $Path -File -Force
    }
    $targets = @($leaf | Where-Object { $_.Name -notmatch '^(Thumbs\.db|\.DS_Store|desktop\.ini)$' })
}
else {
    # 通配符
    $parent = Split-Path -Parent $Path
    $leafName = Split-Path -Leaf $Path
    $searchIn = if ([string]::IsNullOrWhiteSpace($parent)) { (Get-Location).Path } else { $parent }
    if (-not (Test-Path -LiteralPath $searchIn)) { throw "路径不存在：$Path" }
    $gci = if ($Recurse) { Get-ChildItem -LiteralPath $searchIn -File -Recurse } else { Get-ChildItem -LiteralPath $searchIn -File }
    $targets = @($gci | Where-Object { $_.Name -like $leafName })
}

if ($targets.Count -eq 0) {
    Write-Host "没有找到匹配的文件：$Path" -ForegroundColor Yellow
    return
}

Write-Host "`n准备上传 $($targets.Count) 个文件到 uploads/" -ForegroundColor Cyan
$warn = $false
$skip = 0
foreach ($f in $targets) {
    $mb = $f.Length / 1MB
    if ($mb -lt 1) { $tag = "{0:N0} KB" -f ($mb * 1024) }
    elseif ($mb -lt 1024) { $tag = "{0:N2} MB" -f $mb }
    else { $tag = "{0:N2} GB" -f ($mb / 1024) }

    if ($mb -gt 95) {
        Write-Host "  X  $tag  $($f.Name)  （接近或超过 100 MB 硬上限，无法推送，已跳过）" -ForegroundColor Red
        $skip++
    } elseif ($mb -gt 25) {
        Write-Host "  !  $tag  $($f.Name)  （超过 25 MB，建议压缩后上传）" -ForegroundColor Yellow
        $warn = $true
    } else {
        Write-Host  "     $tag  $($f.Name)"
    }
}

# ---- 复制（同名冲突时不覆盖，改名保留两边）----
$passList = @($targets | Where-Object { ($_.Length / 1MB) -le 95 })
$copied = @()
foreach ($f in $passList) {
    $dest = Join-Path $UploadDir $f.Name
    if (Test-Path -LiteralPath $dest) {
        $base = [System.IO.Path]::GetFileNameWithoutExtension($f.Name)
        $ext = [System.IO.Path]::GetExtension($f.Name)
        $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
        $dest = Join-Path $UploadDir ("{0}-{1}{2}" -f $base, $stamp, $ext)
        Write-Host "  同名文件已存在，另存为 $(Split-Path -Leaf $dest)" -ForegroundColor Yellow
    }
    Copy-Item -LiteralPath $f.FullName -Destination $dest
    $copied += (Split-Path -Leaf $dest)
}

if ($copied.Count -eq 0) {
    Write-Host "没有文件被复制。" -ForegroundColor Yellow
    return
}

# ---- 提交与推送 ----
Push-Location $RepoRoot
try {
    Write-Git @('add', '--', 'uploads') | Out-Null

    if ($NoPush) {
        Write-Host "`n已复制到 uploads/ 并暂存（按 -NoPush 未提交）。检查后手动执行：" -ForegroundColor Cyan
        Write-Host '  git commit -m "docs(uploads): 新增云文档"; git push'
        return
    }

    if ([string]::IsNullOrWhiteSpace($Message)) {
        $Message = if ($copied.Count -eq 1) { "docs(uploads): 新增云文档 $($copied[0])" }
                   else { "docs(uploads): 新增 $($copied.Count) 个云文档" }
    }

    $staged = Write-Git @('diff', '--cached', '--name-only')
    if (-not $staged) {
        Write-Host "`n内容与仓库一致，无需提交。" -ForegroundColor Yellow
        return
    }

    Write-Git @('commit', '-m', $Message) | Out-Null
    Write-Host "已提交：$Message"

    Write-Host "正在推送到 GitHub…" -ForegroundColor Cyan
    Write-Git @('push', 'origin', 'HEAD') | Out-Null
    Write-Host "推送完成。" -ForegroundColor Green

    if ($warn) {
        Write-Host "注意：有文件体积偏大，若推送失败请压缩后重试。" -ForegroundColor Yellow
    }

    Write-Host "`nPages 生效通常需要 1-2 分钟，之后打开云文档页面即可看到：`n  https://hardson-k.github.io/html/cloudfiles.html" -ForegroundColor Green
}
finally {
    Pop-Location
}
