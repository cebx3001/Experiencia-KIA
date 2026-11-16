"""Recolor only warm reconstruction particles in the existing Vadeo. No API calls."""
import hashlib,json,subprocess
from pathlib import Path
import cv2
import numpy as np
ROOT=Path(__file__).resolve().parents[2]
SCENE=ROOT/'docs/tasman/video/vadeo'

def main():
 base=SCENE/'color-base/vadeo-original.mp4';base.parent.mkdir(exist_ok=True)
 if not base.exists():base.write_bytes((SCENE/'mobile/vadeo.mp4').read_bytes())
 source=base;out=SCENE/'vadeo-cyan.mp4'
 info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-of','json',str(source)]));s=next(s for s in info['streams'] if s['codec_type']=='video');w,h=s['width'],s['height'];fps=24
 decoder=subprocess.Popen(['ffmpeg','-v','error','-i',str(source),'-f','rawvideo','-pix_fmt','rgb24','-'],stdout=subprocess.PIPE)
 encoder=subprocess.Popen(['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{w}x{h}','-r',str(fps),'-i','-','-i',str(source),'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','copy','-movflags','+faststart',str(out)],stdin=subprocess.PIPE)
 count=0;changed=0
 while True:
  data=decoder.stdout.read(w*h*3)
  if not data:break
  assert len(data)==w*h*3
  rgb=np.frombuffer(data,np.uint8).reshape(h,w,3).copy();t=count/fps
  # Warm emitters exist only in the reconstruction near the tire contacts, not in paint/forest.
  if t<4.0 or t>17:
   hsv=cv2.cvtColor(rgb,cv2.COLOR_RGB2HSV).astype(np.float32)
   yy=np.arange(h)[:,None]
   spatial=(yy>=int(h*.53))&(yy<int(h*.665))
   sat=hsv[:,:,1]/255;val=hsv[:,:,2]/255;hue=hsv[:,:,0]
   gold=(hue>=8)&(hue<=35)&(sat>.075)&(val>.18)&spatial
   alpha=(np.clip((sat-.075)/.14,0,1)*np.clip((val-.18)/.2,0,1)*gold).astype(np.float32)
   # Keep original brightness and spatial texture, changing the hue to the shared cyan.
   corrected=hsv.copy();corrected[:,:,0]=92;corrected[:,:,1]=np.maximum(hsv[:,:,1],100)
   target=cv2.cvtColor(corrected.astype(np.uint8),cv2.COLOR_HSV2RGB)
   rgb=np.clip(rgb*(1-alpha[:,:,None])+target*alpha[:,:,None],0,255).astype(np.uint8);changed+=int(np.count_nonzero(alpha))
  encoder.stdin.write(rgb.tobytes());count+=1
 encoder.stdin.close();assert decoder.wait()==0 and encoder.wait()==0
 (SCENE/'cyan-correction.json').write_text(json.dumps({'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'output_sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'only_correction':'Golden reconstruction particles to cyan; existing vehicle, water, camera and audio preserved.','frames':count,'pixels_selected':changed,'additional_paid_generations':0,'audio':'Copied unchanged'},indent=2)+'\n')
 print('Vadeo recolored:',changed,'particle pixels; no generation.')
if __name__=='__main__':main()
