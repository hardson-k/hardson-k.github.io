"""
批量生成图片缩略图（WebP格式）
用法: python scripts/gen_thumbs.py
输出: image/thumb/ 目录
"""
import os
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("请先安装 Pillow: python -m pip install Pillow")
    sys.exit(1)

IMAGE_DIR = Path(__file__).resolve().parent.parent / "image"
THUMB_DIR = IMAGE_DIR / "thumb"
THUMB_DIR.mkdir(exist_ok=True)

# 支持的图片格式
SUPPORTED = {".png", ".jpg", ".jpeg", ".webp"}

# 头像/小图关键词（宽度400px）
SMALL_KEYWORDS = ["touxiang", "HIMO", "article/"]
# 竖向图件关键词（宽度800px）
PORTRAIT_KEYWORDS = ["驻地", "YX_13", "YX_14", "YX_15", "YX_16", "YX_17",
                      "YX_18", "YX_20", "GR_01", "GR_02", "GR_05", "GR_06",
                      "GR_07", "GR_08", "GR_11", "GR_13", "GR_15"]


def classify_width(filepath: Path) -> int:
    """根据文件名判断缩略图目标宽度"""
    name = filepath.stem
    rel = str(filepath.relative_to(IMAGE_DIR))
    
    # 小图
    for kw in SMALL_KEYWORDS:
        if kw.lower() in rel.lower():
            return 400
    
    # 竖向图件（文件名含竖版特征或已知竖版前缀）
    for kw in PORTRAIT_KEYWORDS:
        if kw.lower() in name.lower():
            return 800
    
    # 默认横向
    return 1200


def generate_thumb(src: Path) -> str:
    """生成单张缩略图，返回输出路径"""
    target_w = classify_width(src)
    dst = THUMB_DIR / f"{src.stem}.webp"
    
    if dst.exists():
        return str(dst.relative_to(IMAGE_DIR))
    
    img = Image.open(src)
    # 保持比例缩放
    w, h = img.size
    ratio = target_w / w
    target_h = int(h * ratio)
    
    img = img.resize((target_w, target_h), Image.LANCZOS)
    
    # 转RGB（处理RGBA的PNG）
    if img.mode == "RGBA":
        bg = Image.new("RGB", img.size, (255, 255, 255))
        bg.paste(img, mask=img.split()[3])
        img = bg
    elif img.mode != "RGB":
        img = img.convert("RGB")
    
    img.save(dst, "WEBP", quality=80)
    
    orig_kb = src.stat().st_size / 1024
    thumb_kb = dst.stat().st_size / 1024
    return f"{dst.relative_to(IMAGE_DIR)} ({orig_kb:.0f}KB -> {thumb_kb:.0f}KB)"


def main():
    count = 0
    skip = 0
    
    for root, dirs, files in os.walk(IMAGE_DIR):
        # 跳过 thumb 目录本身和 article 子目录（文章封面图很小不需要缩略图）
        if "thumb" in root:
            continue
        
        for f in sorted(files):
            ext = os.path.splitext(f)[1].lower()
            if ext not in SUPPORTED:
                continue
            
            src = Path(root) / f
            # 跳过太小的文件（<10KB，已经是小图）
            if src.stat().st_size < 10 * 1024:
                skip += 1
                continue
            
            result = generate_thumb(src)
            print(f"  [{count+1}] {src.name} -> {result}")
            count += 1
    
    print(f"\n完成: {count} 张缩略图生成, {skip} 张小图跳过")
    print(f"输出目录: {THUMB_DIR}")


if __name__ == "__main__":
    main()
