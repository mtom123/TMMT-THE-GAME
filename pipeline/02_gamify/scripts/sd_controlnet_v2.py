"""
TMMT — SD 1.5 + ControlNet Canny on CPU (fp16 weights, fp32 runtime)
Based on the subagent's successful test.
"""
import os, sys, time
os.environ.setdefault('HF_TOKEN', os.environ.get('HF_TOKEN', ''))

import torch
import numpy as np
import cv2
from PIL import Image

torch.set_num_threads(4)

from diffusers import StableDiffusionControlNetPipeline, ControlNetModel, EulerDiscreteScheduler

INPUT_IMG = sys.argv[1] if len(sys.argv) > 1 else "/home/z/my-project/upload/front biker outfit.jpeg"
OUTPUT_IMG = sys.argv[2] if len(sys.argv) > 2 else "/home/z/my-project/download/sd-output.png"
PROMPT_OVERRIDE = sys.argv[3] if len(sys.argv) > 3 else None

SIZE = 512
NUM_STEPS = 6
CFG = 7.0
SEED = 42

print(f"[env] torch={torch.__version__}  cuda={torch.cuda.is_available()}")
print(f"[env] disk free={os.statvfs('/').f_bavail * os.statvfs('/').f_frsize / 1e9:.2f}GB")

# 1. Load + preprocess input
print(f"\n[1] Loading input: {INPUT_IMG}")
raw = Image.open(INPUT_IMG).convert("RGB")
w, h = raw.size
s = min(w, h)
raw = raw.crop(((w-s)//2, (h-s)//2, (w-s)//2+s, (h-s)//2+s)).resize((SIZE, SIZE), Image.LANCZOS)

# 2. Canny edges
print("[2] Canny edges")
gray = cv2.cvtColor(np.array(raw), cv2.COLOR_RGB2GRAY)
v = np.median(gray)
edges = cv2.Canny(gray, int(max(0, 0.66*v)), int(min(255, 1.33*v)))
edge_img = Image.fromarray(cv2.cvtColor(edges, cv2.COLOR_GRAY2RGB))

# 3. Load models (fp16 weights = smaller download)
print("[3] Loading SD 1.5 fp16 + ControlNet Canny fp16...")
t0 = time.time()
controlnet = ControlNetModel.from_pretrained("lllyasviel/sd-controlnet-canny", torch_dtype=torch.float16)
print(f"    ControlNet: {time.time()-t0:.1f}s")

t1 = time.time()
pipe = StableDiffusionControlNetPipeline.from_pretrained(
    "stable-diffusion-v1-5/stable-diffusion-v1-5",
    controlnet=controlnet,
    torch_dtype=torch.float16,
    variant="fp16",
    safety_checker=None,
    requires_safety_checker=False,
)
print(f"    SD pipeline: {time.time()-t1:.1f}s")

pipe.scheduler = EulerDiscreteScheduler.from_config(pipe.scheduler.config)
pipe.to("cpu")
pipe.enable_attention_slicing()

# 4. Inference
PROMPT = PROMPT_OVERRIDE or (
    "cel-shaded anime fashion illustration, jet set radio style, "
    "flat colors, bold black outlines, preserve all garment details"
)
NEG = "photorealistic, 3d render, blurry, deformed, watermark, text, low quality"

print(f"\n[4] Inference: {NUM_STEPS} steps, {SIZE}x{SIZE}")
gen = torch.Generator(device="cpu").manual_seed(SEED)

t2 = time.time()
result = pipe(
    prompt=PROMPT,
    negative_prompt=NEG,
    image=edge_img,
    num_inference_steps=NUM_STEPS,
    guidance_scale=CFG,
    generator=gen,
    width=SIZE, height=SIZE,
)
elapsed = time.time() - t2
print(f"    Done in {elapsed:.1f}s ({elapsed/60:.1f} min)")

result.images[0].save(OUTPUT_IMG)
print(f"    Saved: {OUTPUT_IMG}")
