"""Track and remove the small transient roof beacon in the existing Trailer clip.
Local video repair only; original audio is stream-copied. No image/video API.
"""
import hashlib,json,subprocess
from pathlib import Path
import cv2
import numpy as np
ROOT=Path(__file__).resolve().parents[2];FOLDER=ROOT/'docs/tasman/video/trailer';FPS=24

def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()

def main():
 base=FOLDER/'cleanup-base/trailer-r4.mp4';base.parent.mkdir(exist_ok=True)
 if not base.exists():base.write_bytes((FOLDER/'mobile/trailer.mp4').read_bytes())
 cap=cv2.VideoCapture(str(base));frames=[]
 while True:
  ok,frame=cap.read()
  if not ok:break
  frames.append(frame[437:843].copy())
 cap.release();ref=144;x,y=357,130;template=cv2.cvtColor(frames[ref][y-8:y+4,x-8:x+9],cv2.COLOR_BGR2GRAY)
 records={ref:[357.5,128,17,12,1.]}
 for direction in (-1,1):
  last=np.array([x,y],float);velocity=np.zeros(2)
  for i in range(ref+direction,74 if direction<0 else min(len(frames),448),direction):
   predicted=last+velocity*.7;x0,y0=np.round(predicted-[14,14]).astype(int);grey=cv2.cvtColor(frames[i][y0:y0+28,x0:x0+28],cv2.COLOR_BGR2GRAY);best=(-9,None)
   for scale in np.arange(.35,1.31,.05):
    tw,th=max(3,round(17*scale)),max(3,round(12*scale));temp=cv2.resize(template,(tw,th));correlation=cv2.matchTemplate(grey,temp,cv2.TM_CCOEFF_NORMED)
    yy,xx=np.mgrid[:correlation.shape[0],:correlation.shape[1]];distance=np.hypot(xx+tw/2-(predicted[0]-x0),yy+th/2-(predicted[1]-y0));_,score,_,where=cv2.minMaxLoc(correlation-distance*.007)
    if score>best[0]:best=(score,(x0+where[0]+tw/2,y0+where[1]+th/2,tw,th,float(correlation[where[1],where[0]])))
   _,record=best;position=np.array(record[:2]);velocity=(position-last)*.6+velocity*.4;last=position;records[i]=list(record)
 out=FOLDER/'trailer-roof-clean.mp4';encoder=subprocess.Popen(['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','bgr24','-s','720x1280','-r','24','-i','-','-i',str(base),'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','fast','-crf','17','-pix_fmt','yuv420p','-c:a','copy','-t','20','-movflags','+faststart',str(out)],stdin=subprocess.PIPE)
 decoder=cv2.VideoCapture(str(base));changed=0;masks=[]
 for i in range(480):
  ok,frame=decoder.read()
  if not ok:frame=last_frame.copy()
  last_frame=frame.copy()
  if i in records:
   x,y,w,h,score=records[i]
   if score>=.78:
    x0,y0=x-w/2,y-h/2;mask=np.zeros((406,720),np.uint8)
    left=max(1,int(np.floor(x0))-4);right=min(718,int(np.ceil(x0+w))+4);top=max(1,int(np.floor(y0))-3);bottom=min(404,int(np.ceil(y0+h))+5)
    # A clean plate interpolated between unoccluded background pixels avoids
    # pulling the white beacon or its dark silhouette back into an inpaint.
    fixed=frame[437:843].copy();original=frame[437:843];span=right-left
    u=np.linspace(0,1,span+1)[None,:,None]
    fixed[top:bottom,left:right+1]=np.round(original[top:bottom,left-1:left]*(1-u)+original[top:bottom,right+1:right+2]*u).astype(np.uint8)
    mask[top:bottom,left:right+1]=255;alpha=cv2.GaussianBlur(mask,(3,3),.5).astype(float)/255
    frame[437:843]=np.round(original*(1-alpha[:,:,None])+fixed*alpha[:,:,None]).astype(np.uint8);changed+=1;masks.append({'frame':i,'seconds':i/FPS,'bbox_center':[x,y+437],'width':w,'height':h,'confidence':score,'pixels':int(np.count_nonzero(mask))})
  encoder.stdin.write(frame.tobytes())
 encoder.stdin.close();decoder.release();assert encoder.wait()==0
 def audio_hash(p):return subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-map','0:a:0','-c','copy','-f','hash','-hash','sha256','-']).decode().strip()
 assert audio_hash(base)==audio_hash(out)
 report={'scene':'trailer','method':'Per-frame roof tracking and small tracked background clean plate; no new generated vehicle/scene.','source_sha256':digest(base),'output_sha256':digest(out),'audio_stream_unchanged':True,'audio_hash':audio_hash(out),'processed_frames':480,'locally_repaired_frames':changed,'new_generation_cost_usd':0,'track':masks}
 (FOLDER/'roof-cleanup.json').write_text(json.dumps(report,indent=2)+'\n');print('Repaired roof in',changed,'frames; original audio unchanged.')
if __name__=='__main__':main()
