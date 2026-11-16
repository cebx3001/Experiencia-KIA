"""Extract the interactive camera poses from the approved intro. No paid generation."""
import bisect
import hashlib
import io
import json
from pathlib import Path
import subprocess
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
SCENE=ROOT/'docs/tasman/video/spin'
SOURCE=ROOT/'docs/tasman/video/intro/intro-source.mp4'
MASTER=ROOT/'docs/tasman/video/intro/master.png'
# Camera azimuth landmarks observed in the actual approved orbit, not prompt timings.
KEYS=[(0,7.5),(9,9.45),(18,10.8),(27,11.85),(36,12.8),(45,14.2),(54,15.5),(63,16.65),(72,18.25)]

def main():
 out=SCENE/'scan-frames';out.mkdir(exist_ok=True);records=[]
 for angle in range(72):
  if angle==45:
   im=Image.open(MASTER).convert('RGB').resize((960,540),Image.Resampling.LANCZOS);timestamp=None
  else:
   distance=(45-angle)%72;i=max(0,bisect.bisect_right([k[0] for k in KEYS],distance)-1);a,t=KEYS[i];b,u=KEYS[i+1];timestamp=t+(u-t)*(distance-a)/(b-a)
   data=subprocess.check_output(['ffmpeg','-v','error','-ss',str(timestamp),'-i',str(SOURCE),'-frames:v','1','-vf','scale=960:540','-f','image2pipe','-vcodec','png','-'])
   im=Image.open(io.BytesIO(data)).convert('RGB')
  path=out/f'{angle:02}.webp';im.save(path,'WEBP',quality=94,method=6)
  records.append({'angle_index':angle,'source_seconds':timestamp,'file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
 (SCENE/'scan-frames.json').write_text(json.dumps({'source':'Approved intro orbit','source_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'master_sha256':hashlib.sha256(MASTER.read_bytes()).hexdigest(),'frame_count':72,'same_master_at_index':45,'additional_paid_generation':False,'frames':records},indent=2)+'\n')
 print('Prepared 72 views from approved intro, with exact master anchor.')

if __name__=='__main__':main()
