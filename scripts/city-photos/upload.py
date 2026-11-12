# usage: upload.py id:v ...  (uploads out/<id>_v<v>.jpg as <id>.jpg) ; records in uploaded.json
import sys, json, os, base64, urllib.request, urllib.error, time
D = os.path.dirname(os.path.abspath(__file__))
K = open(f"{D}/anon.txt").read().strip(); T = open(f"{D}/upload_token.txt").read().strip()
UP = f"{D}/uploaded.json"
done = json.load(open(UP)) if os.path.exists(UP) else {}
bad = 0
for a in sys.argv[1:]:
    cid, v = a.split(":")
    if done.get(cid) == int(v): continue
    b = open(f"{D}/out/{cid}_v{v}.jpg", "rb").read()
    body = json.dumps({"cityId": int(cid), "imageBase64": base64.b64encode(b).decode()}).encode()
    for attempt in range(3):
        req = urllib.request.Request("https://ipfjjrngsjixgbmkezzg.supabase.co/functions/v1/upload-city-photo", data=body,
            headers={"Content-Type": "application/json", "Authorization": "Bearer " + K, "x-job-token": T}, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                j = json.loads(r.read())
            assert j.get("ok") and j["bytes"] == len(b), j
            done[cid] = int(v); json.dump(done, open(UP, "w")); break
        except urllib.error.HTTPError as e:
            print("FAIL", cid, e.code, e.read()[:200]); time.sleep(3)
        except Exception as e:
            print("FAIL", cid, repr(e)[:200]); time.sleep(3)
    else: bad += 1
print("uploaded total", len(done), "failed this run", bad)
