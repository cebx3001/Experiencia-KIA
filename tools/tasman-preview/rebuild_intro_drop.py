"""Recompose the approved vehicle's descent from outside the portrait camera.

No generation API. The same approved source supplies the vehicle, physical settling,
complete orbit and scan. Procedural dust/stone trajectories also supply audio cues.
"""
import hashlib,io,json,math,subprocess,tempfile
from pathlib import Path
import cv2
import numpy as np
from PIL import Image,ImageDraw,ImageFilter
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'docs/tasman/video/intro'
FPS=24;CONTACT=1.5;W,H=720,1280
POLYGON=[(97,239),(335,236),(348,177),(378,135),(438,112),(661,111),(709,117),(825,112),(900,130),(1021,257),(1130,276),(1183,295),(1195,351),(1197,380),(1209,398),(1195,483),(1151,490),(1142,530),(1116,561),(1081,566),(1055,548),(1040,516),(913,535),(881,572),(850,599),(798,613),(754,605),(723,579),(709,537),(589,514),(578,539),(550,550),(520,545),(493,521),(340,508),(325,540),(294,563),(250,571),(216,554),(197,528),(184,494),(113,430),(96,400),(99,365),(111,353)]

def source_frame(t):
 data=subprocess.check_output(['ffmpeg','-v','error','-ss',str(t),'-i',str(OUT/'intro-source.mp4'),'-frames:v','1','-f','image2pipe','-vcodec','png','-'])
 return Image.open(io.BytesIO(data)).convert('RGB')

def vehicle_matte():
 image=source_frame(2.1);rgb=np.asarray(image);mask=np.zeros(rgb.shape[:2],np.uint8);cv2.fillPoly(mask,[np.array(POLYGON,np.int32)],1)
 inner=cv2.erode(mask,np.ones((9,9),np.uint8));outer=cv2.dilate(mask,np.ones((31,31),np.uint8));gc=np.where(outer>0,cv2.GC_PR_BGD,cv2.GC_BGD).astype('uint8');gc[mask>0]=cv2.GC_PR_FGD;gc[inner>0]=cv2.GC_FGD
 cv2.grabCut(cv2.cvtColor(rgb,cv2.COLOR_RGB2BGR),gc,None,np.zeros((1,65),float),np.zeros((1,65),float),3,cv2.GC_INIT_WITH_MASK)
 alpha=Image.fromarray(np.where((gc==1)|(gc==3),255,0).astype('uint8')).filter(ImageFilter.GaussianBlur(.6));image=image.convert('RGBA');image.putalpha(alpha)
 portrait=Image.new('RGBA',(W,H));portrait.alpha_composite(image.resize((720,405),Image.Resampling.LANCZOS),(0,437));portrait.save(OUT/'drop-vehicle-matte.png');return portrait

def clean_plate():
 frame=np.asarray(source_frame(0)).copy();row=frame[520].astype(float)
 for y in range(520):
  fade=np.clip((y-430)/90,0,1)**2;frame[y]=np.clip(row*fade,0,255).astype(np.uint8)
 plate=Image.new('RGB',(W,H),'black');plate.paste(Image.fromarray(frame).resize((720,406),Image.Resampling.LANCZOS),(0,437));plate.save(OUT/'drop-floor-vertical.png');return plate

def main():
 vehicle=vehicle_matte();plate=clean_plate();rng=np.random.default_rng(20261116)
 contacts=[(143,763),(445,776),(310,741),(620,756)];clouds=[];stones=[]
 for i in range(100):
  x,y=contacts[i%4];side=-1 if (i//4)%2 else 1
  clouds.append({'x':x,'y':y,'delay':float(rng.uniform(0,.18)),'vx':float(side*rng.uniform(40,175)),'rise':float(rng.uniform(10,55)),'radius':float(rng.uniform(10,24)),'life':float(rng.uniform(1.25,2.4)),'seed':i})
 for i in range(46):
  x,y=contacts[i%4];speed=float(rng.uniform(48,175));gravity=340.;delay=float(rng.uniform(0,.13));life=2*speed/gravity
  stones.append({'x':x,'y':y,'delay':delay,'vx':float(rng.uniform(-170,170)),'speed':speed,'gravity':gravity,'radius':float(rng.uniform(1.2,3.8)),'rotation':float(rng.uniform(0,6.28)),'ground_contact_seconds':CONTACT+delay+life})
 textures=[]
 for i in range(16):
  noise=rng.uniform(0,1,(32,32));noise=Image.fromarray((noise*255).astype('uint8')).resize((128,128),Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(3));n=np.asarray(noise)/255;yy,xx=np.mgrid[-1:1:128j,-1:1:128j];fall=np.exp(-((xx*1.1)**2+(yy*.9)**2)*3.5);a=np.clip(fall*(.3+.7*n)*190,0,255).astype('uint8');texture=Image.new('RGBA',(128,128),(110,139,148,0));texture.putalpha(Image.fromarray(a));textures.append(texture)
 with tempfile.TemporaryDirectory(prefix='tasman-drop-') as directory:
  directory=Path(directory)
  for i in range(round(CONTACT*FPS)):
   t=i/FPS;u=max(0,min(1,(t-.25)/1.25));shift=-850*(1-u*u);frame=plate.convert('RGBA')
   # The floor remains still; the approved, unmodified vehicle silhouette follows gravity.
   if u>0:
    shadow=Image.new('RGBA',(W,H));d=ImageDraw.Draw(shadow)
    for x,y in contacts:d.ellipse((x-40,y-4,x+40,y+8),fill=(0,0,0,int(80*u**4)))
    frame.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(10)))
   for lag,opacity in [(1/48,.12),(1/96,.18),(0,1.0)]:
    old=max(0,min(1,(t-lag-.25)/1.25));offset=round(-850*(1-old*old));layer=vehicle.copy();layer.putalpha(layer.getchannel('A').point(lambda a:int(a*opacity)));frame.alpha_composite(layer,(0,offset))
   frame.convert('RGB').save(directory/f'fall-{i:03}.png')
  fxproc=subprocess.Popen(['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','rgba','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-c:v','qtrle','-pix_fmt','argb',str(directory/'impact-fx.mov')],stdin=subprocess.PIPE)
  for i in range(108):
   t=i/FPS-CONTACT;layer=Image.new('RGBA',(W,H))
   if t>=0:
    for c in clouds:
     age=t-c['delay']
     if not 0<age<c['life']:continue
     size=round((c['radius']+age*38)*2);sprite=textures[c['seed']%16].resize((size,max(1,round(size*.52))),Image.Resampling.BILINEAR);opacity=(1-age/c['life'])**1.4*.5;sprite.putalpha(sprite.getchannel('A').point(lambda a:int(a*opacity)));x=c['x']+c['vx']*age;y=c['y']-c['rise']*age+age*age*12;layer.alpha_composite(sprite,(round(x-size/2),round(y-size*.26)))
    draw=ImageDraw.Draw(layer)
    for rock in stones:
     age=t-rock['delay'];flight=2*rock['speed']/rock['gravity']
     if age<0 or age>flight+.5:continue
     x=rock['x']+rock['vx']*min(age,flight)+rock['vx']*.1*max(age-flight,0);y=rock['y']-rock['speed']*min(age,flight)+.5*rock['gravity']*min(age,flight)**2
     if age>flight:y-=abs(math.sin((age-flight)*12))*math.exp(-(age-flight)*12)*4
     radius=rock['radius'];angle=rock['rotation']+age*5;points=[(x+math.cos(angle+k*math.pi/2)*radius*(1 if k%2 else 1.4),y+math.sin(angle+k*math.pi/2)*radius) for k in range(4)];alpha=int(230*max(0,1-max(age-flight,0)*2));draw.polygon(points,fill=(89,115,122,alpha));draw.line(points[:2],fill=(160,190,196,alpha),width=1)
   fxproc.stdin.write(layer.tobytes())
  fxproc.stdin.close();assert fxproc.wait()==0
  graph=(
   '[0:v]split=2[a][b];[a]trim=start=2.4:end=7.5,setpts=(PTS-STARTPTS)/3.4,fps=24,scale=720:406,pad=720:1280:0:437:black,setsar=1[settle];'
   '[b]trim=start=7.5,setpts=PTS-STARTPTS,fps=24,scale=720:406,pad=720:1280:0:437:black,setsar=1[rest];'
   '[1:v]setsar=1[fall];[fall][settle][rest]concat=n=3:v=1:a=0,settb=AVTB[base];'
   '[2:v]scale=720:1280,setsar=1,fps=24,settb=AVTB,trim=duration=1[master];'
   '[base][master]xfade=transition=fade:duration=0.5:offset=19,trim=duration=20[clean];'
   '[clean][3:v]overlay=eof_action=pass:format=auto,format=yuv420p[v]')
  subprocess.run(['ffmpeg','-v','error','-y','-i',str(OUT/'intro-source.mp4'),'-framerate','24','-i',str(directory/'fall-%03d.png'),'-loop','1','-i',str(ROOT/'docs/tasman/video/shared/master-vertical.png'),'-i',str(directory/'impact-fx.mov'),'-filter_complex',graph,'-map','[v]','-t','20','-an','-c:v','libx264','-preset','fast','-crf','18','-movflags','+faststart',str(OUT/'intro-vertical-drop.mp4')],check=True)
  report={'source_sha256':hashlib.sha256((OUT/'intro-source.mp4').read_bytes()).hexdigest(),'vehicle_source_seconds':2.1,'impact_seconds':CONTACT,'first_frame':'Empty studio; the full vehicle starts outside the portrait camera.','fall_duration_seconds':1.5,'motion':'Fixed floor, accelerated full-silhouette descent, original physical settling.','dust_puffs':len(clouds),'stones':stones,'scan_seconds':[13.7,18.0],'duration_seconds':20,'additional_paid_generations':0}
  (OUT/'drop-composite.json').write_text(json.dumps(report,indent=2)+'\n')
 print('Rebuilt portrait descent, collision at',CONTACT,'seconds; no generation charge.')

if __name__=='__main__':main()
