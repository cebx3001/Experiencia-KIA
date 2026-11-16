"""Verify actual public app bytes, including seven videos and the QR. Read-only."""
import concurrent.futures
import hashlib
import json
from pathlib import Path
import time
import urllib.request

folder=Path('experiencia') if Path('experiencia/public-manifest.json').exists() else Path('experiencia-video')
expected=json.loads((folder/'public-manifest.json').read_text())
base='https://cebx3001.github.io/Experiencia-KIA/experiencia/'

def fetch(name):
    req=urllib.request.Request(base+name+'?verify='+expected['release'],headers={'Cache-Control':'no-cache'})
    with urllib.request.urlopen(req,timeout=60) as response:return response.read()

def check(item):
    name,digest=item
    assert hashlib.sha256(fetch(name)).hexdigest()==digest,name

for attempt in range(20):
    try:
        assert json.loads(fetch('public-manifest.json'))==expected,'Old preview build'
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(check,expected['files'].items()))
        report={'passed':True,'release':expected['release'],'url':base,'files_verified':len(expected['files']),'qr_url':base+'qr.png','generation_submitted':False}
        out=Path('docs/tasman/evidence');out.mkdir(parents=True,exist_ok=True)
        (out/'mobile-pages-verification.json').write_text(json.dumps(report,indent=2)+'\n')
        print(json.dumps(report));break
    except Exception as error:
        print('Awaiting Pages:',str(error),flush=True)
        if attempt==19:raise
        time.sleep(15)
