"""contact sheet: python scripts/sheet.py <dir> <out.jpg> [cols] [width]"""
import os, sys
from PIL import Image, ImageDraw
d, out = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 6
W = int(sys.argv[4]) if len(sys.argv) > 4 else 270
fs = sorted(f for f in os.listdir(d) if f.endswith(".jpg"))
H = int(W * 16 / 9)
rows = (len(fs) + cols - 1) // cols
sheet = Image.new("RGB", (cols * W, rows * (H + 22)), "white")
dr = ImageDraw.Draw(sheet)
for i, f in enumerate(fs):
    im = Image.open(os.path.join(d, f)).convert("RGB").resize((W, H))
    x, y = (i % cols) * W, (i // cols) * (H + 22)
    sheet.paste(im, (x, y + 22))
    dr.text((x + 4, y + 4), f, fill="black")
sheet.save(out, quality=85)
print(out, sheet.size)
