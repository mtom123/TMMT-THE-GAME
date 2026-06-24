"""
TMMT v1.1 — Add face to cartoonified photo via Python compositing (CPU only)

The original photos crop the head off. We composite a stylized anime face
template onto the empty top area of the cartoonified photo.

Approach:
1. Load the cartoonified front view
2. Detect the top empty area (gray padding around 240,240,240)
3. Generate a simple anime head silhouette with PIL (circle + triangle hair)
4. Composite it above the shoulders
5. Apply same cartoon style (Kon Satoshi aesthetic) to the head

This is CPU-only, no HF quota needed.
"""
from PIL import Image, ImageDraw, ImageFilter
import numpy as np
import os

INPUT = '/home/z/my-project/tmmt-repo/pipeline/02_gamify/out/outfit-01/v11/01-front-cartoon-v11-kon.png'
OUT = '/home/z/my-project/tmmt-repo/pipeline/02_gamify/out/outfit-01/v11/01-front-with-face-v11.png'

print(f'=== Adding face (Python compositing, CPU-only) ===')

# Load input
img = Image.open(INPUT).convert('RGB')
w, h = img.size
print(f'Input: {w}x{h}')

arr = np.array(img).astype(np.int16)
hsv = np.array(img.convert('HSV'))

# Kon Satoshi adds colorful texture to padding, can't use saturation alone
# Strategy: look at VALUE (brightness) variance per row
# Padding has uniform low variance, body has high variance (shadows, details)
# Or simpler: assume body occupies bottom 55% of image (photo crop convention)

# Strategy: find the row where brightness variance is highest (likely body center)
# Body should be in the lower 2/3 of the image
body_top = int(h * 0.35)  # body starts ~35% from top
shoulder_y = int(h * 0.45)  # shoulders around 45%

# Find body horizontal extent at shoulder level using brightness variance
# Body pixels are darker than padding (mean ~120 vs ~180)
row_brightness = arr[shoulder_y].mean(axis=1)
median_brightness = np.median(row_brightness)
# Body = pixels darker than median
body_mask = row_brightness < median_brightness

# Find leftmost and rightmost body pixels
body_indices = np.where(body_mask)[0]
if len(body_indices) > 0:
    left_x = body_indices[0]
    right_x = body_indices[-1]
else:
    left_x = w // 4
    right_x = 3 * w // 4

body_width = right_x - left_x
body_center_x = (left_x + right_x) // 2
print(f'Body assumed top at y={body_top}')
print(f'Shoulders at y={shoulder_y}, x=[{left_x}-{right_x}], width={body_width}, center={body_center_x}')

# Create a head ABOVE the shoulders
# Head dimensions proportional to body width
head_width = int(body_width * 0.55)
head_height = int(head_width * 1.3)  # head + neck
neck_height = int(head_width * 0.3)

# Head center horizontally aligned with body
head_center_x = body_center_x
# Position head so chin is just above shoulders
head_bottom = shoulder_y - 5
head_top = max(20, head_bottom - head_height - neck_height)

print(f'Head: width={head_width}, height={head_height}, top={head_top}, bottom={head_bottom}')

# Create a transparent overlay for the head
overlay = Image.new('RGBA', (w, h), (0, 0, 0, 0))
draw = ImageDraw.Draw(overlay)

# === Draw neck (rectangle) ===
neck_left = head_center_x - head_width // 5
neck_right = head_center_x + head_width // 5
neck_top = head_bottom - neck_height
neck_bottom = head_bottom + 5
# Skin tone (warm beige, matching Kon Satoshi palette)
skin_color = (220, 180, 150, 255)
neck_shadow = (180, 140, 110, 255)
draw.rectangle([neck_left, neck_top, neck_right, neck_bottom], fill=skin_color)
# Neck shadow on left side
draw.rectangle([neck_left, neck_top, neck_left + 4, neck_bottom], fill=neck_shadow)

# === Draw face (oval) ===
face_left = head_center_x - head_width // 2
face_right = head_center_x + head_width // 2
face_top = head_top
face_bottom = head_top + head_height
draw.ellipse([face_left, face_top, face_right, face_bottom], fill=skin_color)

# Face shadow on right side (3-band cel-shaded)
shadow_color = (180, 140, 110, 255)
# Create a thin shadow crescent on the right
shadow_width = head_width // 5
draw.ellipse([face_right - shadow_width, face_top, face_right + 5, face_bottom], fill=shadow_color)

# === Draw hair (black with cel-shaded highlight) ===
hair_color = (35, 30, 35, 255)  # dark almost black
hair_highlight = (80, 70, 80, 255)

# Hair covers top of head + side bangs
# Top cap (semicircle)
hair_top = head_top - 5
draw.chord([face_left - 5, hair_top, face_right + 5, face_top + head_height * 0.7],
           start=180, end=360, fill=hair_color)

# Side bangs (left)
draw.polygon([
    (face_left - 5, hair_top + 5),
    (face_left + head_width // 3, hair_top + head_height // 3),
    (face_left + head_width // 4, hair_top + head_height // 2),
    (face_left - 5, hair_top + head_height // 3)
], fill=hair_color)

# Side bangs (right)
draw.polygon([
    (face_right + 5, hair_top + 5),
    (face_right - head_width // 3, hair_top + head_height // 3),
    (face_right - head_width // 4, hair_top + head_height // 2),
    (face_right + 5, hair_top + head_height // 3)
], fill=hair_color)

# Hair highlight (small lighter area on top-left)
draw.chord([face_left + 5, hair_top + 2, face_left + head_width // 2, hair_top + head_height // 2],
           start=200, end=320, fill=hair_highlight)

# === Draw face features (minimal cel-shaded anime style) ===
# Eyes (two black ovals)
eye_y = face_top + head_height // 2 - 5
eye_size_x = head_width // 8
eye_size_y = head_width // 12
left_eye_x = head_center_x - head_width // 5
right_eye_x = head_center_x + head_width // 5

# Eye whites (small)
eye_white = (250, 248, 245, 255)
draw.ellipse([left_eye_x - eye_size_x, eye_y - eye_size_y,
              left_eye_x + eye_size_x, eye_y + eye_size_y], fill=eye_white)
draw.ellipse([right_eye_x - eye_size_x, eye_y - eye_size_y,
              right_eye_x + eye_size_x, eye_y + eye_size_y], fill=eye_white)

# Pupils (black)
pupil_size = eye_size_x // 1.5
draw.ellipse([left_eye_x - pupil_size, eye_y - pupil_size,
              left_eye_x + pupil_size, eye_y + pupil_size], fill=hair_color)
draw.ellipse([right_eye_x - pupil_size, eye_y - pupil_size,
              right_eye_x + pupil_size, eye_y + pupil_size], fill=hair_color)

# Eye highlights (small white dots)
highlight_size = 2
draw.ellipse([left_eye_x - highlight_size - 2, eye_y - highlight_size - 1,
              left_eye_x - 1, eye_y - 1], fill=eye_white)
draw.ellipse([right_eye_x - highlight_size - 2, eye_y - highlight_size - 1,
              right_eye_x - 1, eye_y - 1], fill=eye_white)

# Eyebrows (thin dark lines)
brow_y = eye_y - eye_size_y - 5
brow_thickness = 2
brow_length = head_width // 6
draw.rectangle([left_eye_x - brow_length//2, brow_y,
                left_eye_x + brow_length//2, brow_y + brow_thickness], fill=hair_color)
draw.rectangle([right_eye_x - brow_length//2, brow_y,
                right_eye_x + brow_length//2, brow_y + brow_thickness], fill=hair_color)

# Nose (small dot)
nose_y = eye_y + head_height // 6
draw.ellipse([head_center_x - 1, nose_y - 1, head_center_x + 1, nose_y + 1], fill=(150, 110, 90, 255))

# Mouth (small line)
mouth_y = nose_y + head_height // 8
mouth_w = head_width // 8
draw.rectangle([head_center_x - mouth_w//2, mouth_y,
                head_center_x + mouth_w//2, mouth_y + 2], fill=(140, 80, 70, 255))

# === Outline (cel-shaded black outline) ===
outline_color = (20, 15, 20, 255)
outline_width = 2

# Face outline
draw.ellipse([face_left, face_top, face_right, face_bottom],
             outline=outline_color, width=outline_width)

# Neck outline
draw.rectangle([neck_left, neck_top, neck_right, neck_bottom],
               outline=outline_color, width=outline_width)

# Hair outline (top)
draw.chord([face_left - 5, hair_top, face_right + 5, face_top + head_height * 0.7],
           start=180, end=360, outline=outline_color, width=outline_width)

# === Composite onto original ===
result = Image.alpha_composite(img.convert('RGBA'), overlay)
result = result.convert('RGB')

# Save
result.save(OUT, 'PNG', optimize=True)
print(f'✓ Saved: {OUT}')
print(f'  Size: {os.path.getsize(OUT) // 1024}KB')
