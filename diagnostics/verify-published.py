"""CI verification of the actual published static delivery; never writes to the service."""
import hashlib,json,time,urllib.request,os
from pathlib import Path
root=Path(__file__).resolve().parents[1]
expected=json.loads((root/'experiencia/release.json').read_text())
base=os.environ.get('PUBLIC_URL','https://cebx3001.github.io/Experiencia-KIA/')
def fetch(path):
 req=urllib.request.Request(base+path+'?verify='+expected['codeCommit'],headers={'Cache-Control':'no-cache','User-Agent':'Kia-Tasman-release-verification'})
 with urllib.request.urlopen(req,timeout=60) as r:return r.read()
for attempt in range(20):
 try:
  actual=json.loads(fetch('experiencia/release.json'))
  if actual['codeCommit']!=expected['codeCommit']:raise ValueError('Previous Pages build still being served')
  for name,digest in expected['files'].items():assert hashlib.sha256(fetch(name)).hexdigest()==digest,name
  # Check the large model incrementally; do not confuse an LFS pointer with a GLB.
  url=base+expected.get('modelAsset','studio/assets/kia-tasman-cinematic-lod.glb')
  req=urllib.request.Request(url,headers={'Range':'bytes=0-3'})
  with urllib.request.urlopen(req,timeout=60) as r:assert r.read(4)==b'glTF','Published model is not a binary GLB'
  print(json.dumps({'passed':True,'url':base+'experiencia/','codeCommit':actual['codeCommit'],'files':len(expected['files'])}));break
 except Exception as e:
  print('Awaiting matching Pages release:',str(e),flush=True)
  if attempt==19:raise
  time.sleep(20)
