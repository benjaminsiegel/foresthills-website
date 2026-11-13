"""Build exact-resolution lossless tiles from the original map; verify every pixel."""
from pathlib import Path
from PIL import Image, ImageChops
import sys

source = Image.open(sys.argv[1]).convert('RGB')
out = Path(__file__).resolve().parents[1] / 'map-tiles'
out.mkdir(exist_ok=True)
size = 512
for y in range(0, source.height, size):
    for x in range(0, source.width, size):
        # One pixel of overlap prevents fractional-scale cracks between tiles.
        tile = source.crop((x, y, min(x + size + 1, source.width), min(y + size + 1, source.height)))
        dest = out / f'{x // size}-{y // size}.webp'
        tile.save(dest, 'WEBP', lossless=True, method=6)
        assert ImageChops.difference(tile, Image.open(dest).convert('RGB')).getbbox() is None, dest
print(f'Verified {len(list(out.glob("*.webp")))} lossless tiles.')
