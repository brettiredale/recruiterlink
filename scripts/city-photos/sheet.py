# usage: sheet.py prefix id[:v] ...   or  sheet.py prefix ALL  -> contact sheets, 20 per sheet (4x5)
import sys, json, os, glob
from PIL import Image, ImageDraw, ImageFont
D = os.path.dirname(os.path.abspath(__file__))
cities = {c["city_id"]: c for c in json.load(open(f"{D}/cities.json"))}
order = [c["city_id"] for c in json.load(open(f"{D}/cities.json"))]
def latest(cid):
    v = 0
    while os.path.exists(f"{D}/out/{cid}_v{v+1}.jpg"): v += 1
    return v
chosen = json.load(open(f"{D}/chosen.json")) if os.path.exists(f"{D}/chosen.json") else {}
prefix = sys.argv[1]; args = sys.argv[2:]
items = []
if args == ["ALL"]:
    for cid in order:
        v = chosen.get(str(cid), latest(cid))
        if v: items.append((cid, v))
else:
    for a in args:
        cid, _, v = a.partition(":")
        cid = int(cid); items.append((cid, int(v) if v else latest(cid)))
font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 17)
TW, TH, LH, COLS, ROWS = 480, 270, 24, 4, 5
for s in range(0, len(items), COLS * ROWS):
    chunk = items[s:s + COLS * ROWS]
    sheet = Image.new("RGB", (COLS * TW, ROWS * (TH + LH)), "white")
    d = ImageDraw.Draw(sheet)
    for i, (cid, v) in enumerate(chunk):
        x, y = (i % COLS) * TW, (i // COLS) * (TH + LH)
        sheet.paste(Image.open(f"{D}/out/{cid}_v{v}.jpg").resize((TW, TH), Image.LANCZOS), (x, y + LH))
        c = cities[cid]
        d.text((x + 4, y + 2), f"{cid} {c['name']}, {c['country_iso2']} v{v}"[:46], fill="black", font=font)
    p = f"{D}/sheets/{prefix}_{s // (COLS * ROWS) + 1:02d}.jpg"
    sheet.save(p, quality=85); print(p, len(chunk))
