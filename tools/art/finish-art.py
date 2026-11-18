"""tools/art/png/*.png を assets/ に置く（背景は WebP、ほかは PNG のまま）。

    python tools/art/make-art.py
    powershell -ExecutionPolicy Bypass -File tools/art/rasterize.ps1
    python tools/art/finish-art.py
"""
import os
from PIL import Image

here = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(os.path.dirname(here))
png = os.path.join(here, 'png')
plan = {
    'ladybug': 'assets/character.png',
    'web': 'assets/obstacles/web.png',
    'frog': 'assets/obstacles/frog.png',
    'mantis': 'assets/obstacles/mantis.png',
    'aphid': 'assets/items/aphid.png',
    'dandelion': 'assets/flowers/dandelion.png',
    'cosmos': 'assets/flowers/cosmos.png',
    'morning': 'assets/bg/morning.webp',
    'day': 'assets/bg/day.webp',
    'sunset': 'assets/bg/sunset.webp',
    'night': 'assets/bg/night.webp',
}
for name, dest in plan.items():
    out = os.path.join(root, dest)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    im = Image.open(os.path.join(png, name + '.png'))
    if dest.endswith('.webp'):
        im.convert('RGB').save(out, quality=86)
    else:
        im.save(out, optimize=True)
    print(dest)
