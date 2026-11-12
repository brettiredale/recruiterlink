import sys, json, os, base64, time, io, threading, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor
from PIL import Image
import meta
D = os.path.dirname(os.path.abspath(__file__))
CAP = 400
lock = threading.Lock()
CNT = os.path.join(D, "count.txt"); LOG = os.path.join(D, "log.jsonl")
def bump():
    with lock:
        n = int(open(CNT).read()) if os.path.exists(CNT) else 0
        if n >= CAP: return None
        open(CNT, "w").write(str(n + 1)); return n + 1
def log(**k):
    with lock: open(LOG, "a").write(json.dumps(k) + "\n")
def call(model, body):
    req = urllib.request.Request("https://fal.run/" + model, data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=110) as r:
        return json.loads(r.read())
def one(c, extra, model, res):
    cid = c["city_id"]; p = meta.prompt(c, extra)
    if model == "fal-ai/flux-3-image":
        body = dict(prompt=p, aspect_ratio="16:9", resolution=res, output_format="jpeg", sync_mode=True)
    else:
        body = dict(prompt=p, aspect_ratio="16:9", resolution="1K", output_format="jpeg", sync_mode=True, enable_web_search=True)
    for attempt in range(int(os.environ.get("ATTEMPTS","1"))):
        n = bump()
        if n is None:
            log(city=cid, name=c["name"], err="CAP REACHED"); return False
        t = time.time()
        try:
            j = call(model, body)
            url = j["images"][0]["url"]
            raw = base64.b64decode(url.split(",", 1)[1])
            im = Image.open(io.BytesIO(raw)).convert("RGB")
            w, h = im.size
            v = 1
            while os.path.exists(f"{D}/raw/{cid}_v{v}.jpg"): v += 1
            open(f"{D}/raw/{cid}_v{v}.jpg", "wb").write(raw)
            # crop to exact 16:9 then 1600x900
            tw, th = (w, round(w * 9 / 16)) if w * 9 <= h * 16 else (round(h * 16 / 9), h)
            l = (w - tw) // 2; tp = (h - th) // 2
            im = im.crop((l, tp, l + tw, tp + th)).resize((1600, 900), Image.LANCZOS)
            im.save(f"{D}/out/{cid}_v{v}.jpg", "JPEG", quality=82, optimize=True, progressive=True)
            log(city=cid, name=c["name"], model=model, v=v, n=n, ok=True, secs=round(time.time() - t), size=[w, h], prompt=p)
            print(f"ok {cid} {c['name']} v{v} {w}x{h} {round(time.time()-t)}s #{n}", flush=True)
            return True
        except urllib.error.HTTPError as e:
            msg = e.read()[:300].decode("utf8", "replace")
            log(city=cid, name=c["name"], model=model, n=n, ok=False, http=e.code, msg=msg, secs=round(time.time()-t))
            print(f"FAIL {cid} {c['name']} http {e.code} {msg[:120]} {round(time.time()-t)}s #{n}", flush=True)
            if e.code in (400, 422): return False
            time.sleep(20 if e.code == 429 else 8)
        except Exception as e:
            log(city=cid, name=c["name"], model=model, n=n, ok=False, msg=repr(e)[:300], secs=round(time.time()-t))
            print(f"FAIL {cid} {c['name']} {repr(e)[:120]} #{n}", flush=True)
            time.sleep(8)
    return False
if __name__ == "__main__":
    # usage: gen.py jobs.json   -> [{"id":..,"extra":optional,"model":optional}]
    cities = {c["city_id"]: c for c in json.load(open(f"{D}/cities.json"))}
    jobs = json.load(open(sys.argv[1]))
    res = sys.argv[2] if len(sys.argv) > 2 else "1.5k"
    with ThreadPoolExecutor(int(os.environ.get("PAR","3"))) as ex:
        r = list(ex.map(lambda j: one(cities[j["id"]], j.get("extra"), j.get("model", "fal-ai/flux-3-image"), res), jobs))
    print("done", sum(r), "of", len(r), "count", open(CNT).read())
