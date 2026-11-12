# Run 2 (nano-banana-pro only). usage: gen2.py id[=extra-file] ...   Hard cap 160 requests, counted in count2.txt.
import sys, json, os, base64, time, io, threading, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor
from PIL import Image
import meta
D = os.path.dirname(os.path.abspath(__file__))
CAP = 160; MODEL = "fal-ai/nano-banana-pro"
lock = threading.Lock(); STOP = threading.Event()
CNT = f"{D}/count2.txt"; LOG = f"{D}/log2.jsonl"
def bump():
    with lock:
        n = int(open(CNT).read()) if os.path.exists(CNT) else 0
        if n >= CAP: return None
        open(CNT, "w").write(str(n + 1)); return n + 1
def log(**k):
    with lock: open(LOG, "a").write(json.dumps(k) + "\n")
def one(job):
    c, extra = job
    cid = c["city_id"]; p = meta.prompt(c, extra)
    if STOP.is_set(): return False
    n = bump()
    if n is None:
        print("CAP REACHED", cid, flush=True); return False
    body = dict(prompt=p, aspect_ratio="16:9", resolution="1K", output_format="jpeg", num_images=1, sync_mode=True, enable_web_search=True)
    t = time.time()
    try:
        req = urllib.request.Request("https://fal.run/" + MODEL, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"}, method="POST")
        with urllib.request.urlopen(req, timeout=110) as r: j = json.loads(r.read())
        raw = base64.b64decode(j["images"][0]["url"].split(",", 1)[1])
        im = Image.open(io.BytesIO(raw)).convert("RGB"); w, h = im.size
        v = 1
        while os.path.exists(f"{D}/raw/{cid}_v{v}.jpg") or os.path.exists(f"{D}/out/{cid}_v{v}.jpg"): v += 1
        open(f"{D}/raw/{cid}_v{v}.jpg", "wb").write(raw)
        tw, th = (w, round(w * 9 / 16)) if w * 9 <= h * 16 else (round(h * 16 / 9), h)
        l = (w - tw) // 2; tp = (h - th) // 2
        im.crop((l, tp, l + tw, tp + th)).resize((1600, 900), Image.LANCZOS).save(f"{D}/out/{cid}_v{v}.jpg", "JPEG", quality=82, optimize=True, progressive=True)
        log(city=cid, name=c["name"], v=v, n=n, ok=True, secs=round(time.time() - t), size=[w, h], prompt=p)
        print(f"ok {cid} {c['name']} v{v} {w}x{h} {round(time.time()-t)}s #{n}", flush=True); return True
    except urllib.error.HTTPError as e:
        msg = e.read()[:300].decode("utf8", "replace")
        if e.code == 403 or "balance" in msg.lower(): STOP.set()
        log(city=cid, name=c["name"], n=n, ok=False, http=e.code, msg=msg, secs=round(time.time()-t))
        print(f"FAIL {cid} {c['name']} http {e.code} {msg[:160]} {round(time.time()-t)}s #{n}", flush=True)
    except Exception as e:
        log(city=cid, name=c["name"], n=n, ok=False, msg=repr(e)[:300], secs=round(time.time()-t))
        print(f"FAIL {cid} {c['name']} {repr(e)[:160]} {round(time.time()-t)}s #{n}", flush=True)
    return False
if __name__ == "__main__":
    cities = {c["city_id"]: c for c in json.load(open(f"{D}/cities.json"))}
    jobs = []
    for a in sys.argv[1:]:
        cid, _, ex = a.partition("=")
        jobs.append((cities[int(cid)], open(ex).read().strip() if ex else None))
    with ThreadPoolExecutor(2) as ex: r = list(ex.map(one, jobs))
    print("done", sum(r), "of", len(r), "count", open(CNT).read(), "STOPPED" if STOP.is_set() else "")
