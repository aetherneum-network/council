#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate assets/council-demo.gif — an animated terminal-style hero built from the
REAL recorded verdict in src/demo-result.json. Parchment/brand palette. No fake data."""
import json, os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
DATA = json.loads((ROOT / "src" / "demo-result.json").read_text(encoding="utf-8"))
OUT = ROOT / "assets" / "council-demo.gif"

# palette (Aetherneum brand)
BG      = (245, 241, 230)   # parchment
PANEL   = (250, 247, 239)
INK     = (13, 27, 42)
MUTE    = (122, 116, 102)
LINE    = (217, 211, 196)
TEAL    = (14, 116, 144)
GOLD    = (146, 64, 14)
RED     = (162, 59, 45)
GREEN   = (47, 125, 79)
DIMBAR  = (203, 197, 180)

VCOLOR = {"approve": GREEN, "revise": GOLD, "veto": RED, "abstain": MUTE}
VICON  = {"approve": "OK", "revise": "~", "veto": "X", "abstain": "."}

def font(paths, size):
    for p in paths:
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            continue
    return ImageFont.load_default()

MONO = ["C:/Windows/Fonts/JetBrainsMono-Regular.ttf",
        os.path.expanduser("~/Aetherneum/04-prompts/aetherneum-brand-kit/fonts/JetBrainsMono-Regular.ttf"),
        "C:/Windows/Fonts/consola.ttf", "DejaVuSansMono.ttf"]
MONO_B = ["C:/Windows/Fonts/JetBrainsMono-Bold.ttf",
          "C:/Windows/Fonts/consolab.ttf", "DejaVuSansMono-Bold.ttf"]
F   = font(MONO, 22)
FB  = font(MONO_B, 22)
FS  = font(MONO, 18)

W, H = 860, 600
PADX, TOP, LH = 34, 70, 30

def bar(p, n=16):
    f = round(p * n)
    return "█" * f, "░" * (n - f)  # full / light shade

# Build the script as a list of "lines"; each line is a list of (text, font, color) segments.
ops = sorted(DATA["opinions"], key=lambda o: -o["confidence"])
panel = DATA["panel"]
agree = round(DATA["agreement"] * 100)

lines = []
def L(*segs): lines.append(list(segs))

DIA = "DIA"  # marker: draw a brand diamond glyph instead of text

L(("$ ", F, TEAL), ("npx @aetherneum/council ", F, INK),
  ("\"Should we store JWTs in localStorage?\"", F, MUTE))
L()
L(("  ", F, MUTE), ("", DIA, MUTE), (" convening the Council…", F, MUTE))
L()
L(("  ", F, TEAL), ("", DIA, TEAL), (" THE COUNCIL", FB, TEAL), ("   multi-model verdict", FS, MUTE))
L(("  " + "─" * 44, F, LINE))
pc = VCOLOR[panel]
L(("  " + VICON[panel] + "  " + panel.upper(), FB, pc),
  (f"      {agree}% agreement", F, MUTE),
  ("     · split" if DATA["split"] else "", F, GOLD))
L()
for o in ops:
    c = VCOLOR[o["verdict"]]
    full, light = bar(o["confidence"])
    L(("  " + VICON[o["verdict"]] + " ", FB, c),
      (f"{o['seat']:<17}", F, INK),
      (f"{o['verdict'].upper():<7} ", F, c),
      (full, F, c), (light, F, DIMBAR),
      (f" {round(o['confidence']*100)}%", F, MUTE))
L()
L(("  ", F, GOLD), ("", DIA, GOLD), (" WHERE THEY DISAGREE", FB, GOLD))
dnames = " & ".join(d["seat"].split()[-1] for d in DATA["dissent"])
L((f"    {dnames} want REVISE → use httpOnly cookies, don't block", FS, INK))
L()
_seen, _risks = set(), []
for r in DATA["risks"]:
    t = r["risk"].strip()
    if len(t) <= 20 and t.lower() not in _seen:
        _seen.add(t.lower()); _risks.append(t)
    if len(_risks) >= 4:
        break
L(("  ! RISKS  ", FB, RED), (" · ".join(_risks), FS, INK))
L()
L((f"  {DATA['seats']['answered']}/{DATA['seats']['attempted']} seats answered  ·  per Æthera ad astra", FS, MUTE))

def draw_frame(nlines):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    # window chrome
    d.rounded_rectangle([12, 12, W - 12, H - 12], radius=14, fill=PANEL, outline=LINE, width=2)
    for i, col in enumerate([(229, 115, 95), (224, 184, 70), (47, 125, 79)]):
        d.ellipse([34 + i * 22, 30, 48 + i * 22, 44], fill=col)
    d.text((W // 2, 37), "the council", font=FS, fill=MUTE, anchor="mm")
    y = TOP
    for li in lines[:nlines]:
        x = PADX
        for (txt, fnt, col) in li:
            if fnt == DIA:
                cy = y + 13
                d.polygon([(x + 9, cy - 8), (x + 17, cy), (x + 9, cy + 8), (x + 1, cy)], fill=col)
                x += 20
                continue
            if not txt:
                continue
            d.text((x, y), txt, font=fnt, fill=col)
            x += d.textlength(txt, font=fnt)
        y += LH
    return img

frames, durs = [], []
# 1) type the command (cursor reveal) → show first line growing
total = len(lines)
# reveal: command(1), blank(2), convening(3), then verdict block lines one-by-one
reveal_steps = [1, 3] + list(range(5, total + 1))
for i, n in enumerate(reveal_steps):
    frames.append(draw_frame(n))
    durs.append(700 if n == 1 else (650 if n == 3 else 220))
# hold the final frame
frames.append(draw_frame(total)); durs.append(3200)

frames[0].save(OUT, save_all=True, append_images=frames[1:], duration=durs,
               loop=0, optimize=True, disposal=2)
print(f"wrote {OUT}  ({OUT.stat().st_size//1024} KB, {len(frames)} frames)")
