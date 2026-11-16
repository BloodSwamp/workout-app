"""Rebuild the simple SVG icon as PNGs with only Python's standard library."""
from pathlib import Path
import struct
import zlib

ROOT = Path(__file__).resolve().parents[1]
RECTS = [(144,246,224,20,10), (132,200,32,112,10),
         (176,176,32,160,10), (304,176,32,160,10), (348,200,32,112,10)]

def inside(x, y, rect):
    left, top, width, height, radius = rect
    cx = min(max(x, left + radius), left + width - radius)
    cy = min(max(y, top + radius), top + height - radius)
    return (x-cx)**2 + (y-cy)**2 <= radius**2

def chunk(kind, data):
    return struct.pack('!I', len(data)) + kind + data + struct.pack('!I', zlib.crc32(kind+data))

for size in (192, 512):
    rows = bytearray()
    for y in range(size):
        rows.append(0)
        for x in range(size):
            hits = sum(any(inside((x+(sx+.5)/2)*512/size,
                                  (y+(sy+.5)/2)*512/size, r) for r in RECTS)
                       for sy in range(2) for sx in range(2))
            rows.extend(round(bg+(fg-bg)*hits/4) for bg, fg in zip((23,39,31), (230,239,217)))
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!2I5B', size,size,8,2,0,0,0))
    png += chunk(b'IDAT', zlib.compress(rows)) + chunk(b'IEND', b'')
    (ROOT / 'icons' / f'icon-{size}.png').write_bytes(png)
