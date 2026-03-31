#!/usr/bin/env python3
"""Generate all favicon and PWA icon assets with dark background and rounded corners."""

from PIL import Image, ImageDraw
import os
import struct
import zlib

SOURCE = os.path.join(os.path.dirname(__file__), '..', 'LionOnlyWhite.png')
ICONS_OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'icons')
APP_OUT = os.path.join(os.path.dirname(__file__), '..', 'src', 'app')

BG_COLOR = (10, 10, 10, 255)       # #0a0a0a
LION_COLOR = (245, 245, 240, 255)  # #f5f5f0 (court-white)

SIZES = {
    'favicon-16x16.png': 16,
    'favicon-32x32.png': 32,
    'favicon-96x96.png': 96,
    'apple-icon-57x57.png': 57,
    'apple-icon-60x60.png': 60,
    'apple-icon-72x72.png': 72,
    'apple-icon-76x76.png': 76,
    'apple-icon-114x114.png': 114,
    'apple-icon-120x120.png': 120,
    'apple-icon-144x144.png': 144,
    'apple-icon-152x152.png': 152,
    'apple-icon-180x180.png': 180,
    'apple-icon-precomposed.png': 180,
    'apple-icon.png': 180,
    'android-icon-36x36.png': 36,
    'android-icon-48x48.png': 48,
    'android-icon-72x72.png': 72,
    'android-icon-96x96.png': 96,
    'android-icon-144x144.png': 144,
    'android-icon-192x192.png': 192,
    'android-icon-512x512.png': 512,
    'ms-icon-70x70.png': 70,
    'ms-icon-144x144.png': 144,
    'ms-icon-150x150.png': 150,
    'ms-icon-310x310.png': 310,
}


def make_rounded_mask(size, radius):
    """Create a rounded-rectangle mask."""
    mask = Image.new('L', (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return mask


def make_icon(size, maskable=False):
    """
    Build a single icon at `size`x`size` pixels.
    - maskable=True: no rounded corners (the OS applies its own mask shape),
      and the lion is padded to 80% of the canvas (safe zone).
    """
    canvas = Image.new('RGBA', (size, size), BG_COLOR)

    # Load the white lion (already white on transparent background)
    src = Image.open(SOURCE).convert('RGBA')
    lion = src

    # Scale preserving aspect ratio so the lion fits within the target box
    lion_fraction = 0.80 if maskable else 0.85
    box = int(size * lion_fraction)
    lion_w, lion_h = lion.size
    scale = min(box / lion_w, box / lion_h)
    new_w, new_h = int(lion_w * scale), int(lion_h * scale)
    lion_resized = lion.resize((new_w, new_h), Image.LANCZOS)

    offset_x = (size - new_w) // 2
    offset_y = (size - new_h) // 2
    canvas.paste(lion_resized, (offset_x, offset_y), lion_resized)

    if not maskable:
        radius = max(2, int(size * 0.18))
        mask = make_rounded_mask(size, radius)
        canvas.putalpha(mask)

    return canvas


def save_ico(images_by_size, path):
    """Write a proper multi-resolution .ico file."""
    # Sort sizes ascending
    entries = sorted(images_by_size.items())
    num = len(entries)

    # ICO header: ICONDIR
    header = struct.pack('<HHH', 0, 1, num)  # reserved, type=1 (ICO), count

    raw_images = []
    for size, img in entries:
        # Convert to RGBA PNG bytes
        import io
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        raw_images.append(buf.getvalue())

    # Build ICONDIRENTRY table
    data_offset = 6 + num * 16
    dir_entries = b''
    for i, (size, _) in enumerate(entries):
        png_data = raw_images[i]
        w = size if size < 256 else 0
        h = size if size < 256 else 0
        entry = struct.pack('<BBBBHHII',
            w, h,       # width, height (0 = 256)
            0,          # color count
            0,          # reserved
            1,          # color planes
            32,         # bits per pixel
            len(png_data),
            data_offset,
        )
        dir_entries += entry
        data_offset += len(png_data)

    with open(path, 'wb') as f:
        f.write(header)
        f.write(dir_entries)
        for png_data in raw_images:
            f.write(png_data)


def main():
    os.makedirs(ICONS_OUT, exist_ok=True)

    print('Generating icons...')
    for filename, size in SIZES.items():
        img = make_icon(size)
        out_path = os.path.join(ICONS_OUT, filename)
        img.save(out_path, format='PNG', optimize=True)
        print(f'  {filename} ({size}x{size})')

    # Maskable icon for Android PWA (no rounded corners, OS applies its own shape)
    maskable = make_icon(512, maskable=True)
    maskable.save(os.path.join(ICONS_OUT, 'maskable-icon-512x512.png'), format='PNG', optimize=True)
    print('  maskable-icon-512x512.png (512x512)')

    # src/app/icon.png — Next.js uses this for <link rel="icon">
    app_icon = make_icon(512)
    app_icon.save(os.path.join(APP_OUT, 'icon.png'), format='PNG', optimize=True)
    print('  src/app/icon.png (512x512)')

    # src/app/favicon.ico — multi-size for browser tabs
    ico_sizes = {16: make_icon(16), 32: make_icon(32), 48: make_icon(48)}
    save_ico(ico_sizes, os.path.join(APP_OUT, 'favicon.ico'))
    print('  src/app/favicon.ico (16, 32, 48)')

    print('\nDone.')


if __name__ == '__main__':
    main()
