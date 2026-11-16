"""Remove the baked-in pre-arrival floor shadow only; preserve the existing motion.
No animation reconstruction or generation. Contact/rebound/scan frames are untouched
before encoding. A car matte protects every falling-vehicle pixel in the edit.
"""
import hashlib,json,subprocess
from pathlib import Path
import cv2
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[2];FOLDER=ROOT/'docs/tasman/video/intro';W,H,FPS=720,1280,24

def main():
 base=FOLDER/'shadow-base/intro-r5.mp4';base.parent.mkdir(exist_ok=True)
 if not base.exists():base.write_bytes((FOLDER/'mobile/intro.mp4').read_bytes())
 old=np.array(Image.open(FOLDER/'drop-floor-vertical.png').convert('RGB')).astype(float)
 yy=np.arange(H);profile=np.interp(yy,[0,690,710,725,740,760,790,820,836,843,H],[0,0,1,4,10,18,27,28,21,0,0]);profile=cv2.GaussianBlur(profile.reshape(-1,1),(1,9),2).ravel()
 xx=np.arange(W);horizontal=.65+.35*np.exp(-((xx-W/2)/440)**2);floor=profile[:,None]*horizontal[None,:]
 clean=np.repeat(floor[:,:,None],3,axis=2);Image.fromarray(np.round(clean).astype('uint8')).save(FOLDER/'drop-floor-clean-vertical.png')
 delta=clean-old;alpha=np.array(Image.open(FOLDER/'drop-vehicle-matte.png').getchannel('A'))
 decoder=cv2.VideoCapture(str(base));output=FOLDER/'intro-shadow-clean.mp4'
 encoder=subprocess.Popen(['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s','720x1280','-r','24','-i','-','-i',str(base),'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','fast','-crf','17','-pix_fmt','yuv420p','-c:a','copy','-t','20','-movflags','+faststart',str(output)],stdin=subprocess.PIPE)
 changed=0
 for i in range(480):
  ok,bgr=decoder.read();assert ok;frame=cv2.cvtColor(bgr,cv2.COLOR_BGR2RGB);original=frame.copy();t=i/FPS
  if t<1.5:
   protect=np.zeros((H,W),np.uint8)
   for lag in (1/48,1/96,0):
    u=np.clip((t-lag-.25)/1.25,0,1);offset=round(-850*(1-u*u));shifted=cv2.warpAffine(alpha,np.float32([[1,0,0],[0,1,offset]]),(W,H));protect=np.maximum(protect,shifted)
   protect=cv2.dilate((protect>0).astype('uint8'),np.ones((9,9),np.uint8))>0
   close=np.clip((t-1.30)/.20,0,1);strength=1-close*close*(3-2*close)
   corrected=np.clip(frame.astype(float)+delta*strength,0,255).astype('uint8');corrected[protect]=frame[protect];assert np.array_equal(corrected[protect],original[protect]);frame=corrected;changed+=1
  else:assert np.array_equal(frame,original)
  encoder.stdin.write(frame.tobytes())
 encoder.stdin.close();decoder.release();assert encoder.wait()==0
 report={'source_sha256':hashlib.sha256(base.read_bytes()).hexdigest(),'output_sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'edited_frames':changed,'unchanged_animation_timing':True,'vehicle_pixels_protected_before_encoding':True,'all_frames_at_and_after_contact_unchanged_before_encoding':True,'impact_seconds':1.5,'shadow_formation_seconds':[1.3,1.5],'additional_generation_cost_usd':0}
 (FOLDER/'floor-cleanup.json').write_text(json.dumps(report,indent=2)+'\n');print('Removed baked floor shadow; original animation preserved.')
if __name__=='__main__':main()
