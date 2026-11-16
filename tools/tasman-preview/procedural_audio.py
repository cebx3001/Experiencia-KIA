"""Original granular sound driven by actual cyan reconstruction pixels and VFX events.
No samples, music library, generation service or API. Stereo is mono-compatible.
"""
import hashlib,json,math,subprocess,tempfile,wave
from pathlib import Path
import cv2
import numpy as np
ROOT=Path(__file__).resolve().parents[2];VIDEO=ROOT/'docs/tasman/video';RATE=48000;DURATION=20

def colored(rng,n,low,high):
 frequencies=np.fft.rfftfreq(n,1/RATE);spectrum=np.fft.rfft(rng.normal(size=n));shape=(1-np.exp(-(frequencies/max(low,1))**4))*np.exp(-(frequencies/high)**4);sound=np.fft.irfft(spectrum*shape,n=n);return sound/max(np.sqrt(np.mean(sound*sound)),1e-6)

def cues(source,scene):
 w,h=160,284;proc=subprocess.Popen(['ffmpeg','-v','error','-i',str(source),'-vf',f'fps=24,scale={w}:{h}','-pix_fmt','rgb24','-f','rawvideo','-'],stdout=subprocess.PIPE)
 previous=np.zeros((h,w),bool);events=[];i=0
 while True:
  data=proc.stdout.read(w*h*3)
  if not data:break
  rgb=np.frombuffer(data,np.uint8).reshape(h,w,3).astype(float);r,g,b=rgb[:,:,0],rgb[:,:,1],rgb[:,:,2];mask=(g>r*1.17)&(b>r*1.25)&(g>b*.78)&(np.maximum(g,b)>100)
  t=i/24;active=(13.5<t<19.2) if scene=='intro' else (.15<t<19.6) if scene=='cargo' else (.15<t<4.6 or 13.4<t<19.6)
  change=mask^previous
  if active and np.count_nonzero(mask)>4 and np.count_nonzero(change)>4:
   yy,xx=np.where(change);energy=min(1,float(np.sqrt(len(xx)/(w*h)))*5)
   if len(xx):events.append({'time':t,'energy':energy,'pan':float(np.mean(xx)/w*1.5-.75),'depth':float(np.clip((np.mean(yy)/h-.3)/.4,0,1)),'release':scene!='intro' and t>13.4})
  previous=mask;i+=1
 assert proc.wait()==0;return events

def synth(scene,source):
 seed=20261116+sum(map(ord,scene));rng=np.random.default_rng(seed);audio=np.zeros((RATE*DURATION,2),np.float64);grain_count=0
 def add(t,signal,gain,pan=0):
  at=round(t*RATE);end=min(len(audio),at+len(signal))
  if at<0 or at>=len(audio):return
  signal=signal[:end-at]*gain;audio[at:end,0]+=signal*math.sqrt((1-pan)/2);audio[at:end,1]+=signal*math.sqrt((1+pan)/2)
 def material(t,duration,low,high,gain,pan=0,reverse=False):
  n=round(duration*RATE);x=np.arange(n)/RATE;signal=colored(rng,n,low,high);envelope=(1-np.exp(-x/0.0008))*np.exp(-x/(duration*.19));envelope*=np.minimum((duration-x)/.002,1)
  if reverse:envelope=envelope[::-1]
  add(t,signal*envelope,gain,pan)
 events=cues(source,scene)
 for event in events:
  for _ in range(1+int(event['energy']*3)):
   length=float(rng.uniform(.009,.034));depth=event['depth'];material(event['time']+rng.uniform(0,.035),length,550,2600+depth*4800,(.025+.09*event['energy'])*(.6+.4*depth),float(np.clip(event['pan']+rng.uniform(-.12,.12),-.85,.85)),event['release']);grain_count+=1
  if event['energy']>.5 and rng.random()<.18:material(event['time'],.065,190,1500,.035,event['pan'],event['release'])
 if scene=='intro':
  recipe=json.loads((VIDEO/'intro/drop-composite.json').read_text());impact=recipe['impact_seconds'];n=round(.68*RATE);t=np.arange(n)/RATE
  body=colored(rng,n,32,460)*(1-np.exp(-t/.0015))*np.exp(-t/.095)
  # Damped material resonances, not a pitched sweep or a stock cinematic boom.
  for frequency,gain,decay in [(76,.16,13),(141,.12,19),(283,.06,31)]:body+=gain*np.sin(2*np.pi*frequency*t)*np.exp(-decay*t)
  add(impact,np.tanh(body*1.5)/1.5,.65)
  for offset,pan in [(0,-.45),(.012,.5),(.024,-.1),(.032,.7)]:material(impact+offset,.095,130,1200,.09,pan)
  material(impact+.08,.18,180,1700,.045)
  n=round(1.8*RATE);t=np.arange(n)/RATE;air=colored(rng,n,900,6300)*(1-np.exp(-t/.06))*np.exp(-t*3.5);add(impact+.04,air,.065,-.25);add(impact+.08,air*.7,.045,.5)
  for stone in recipe['stones']:
   radius=stone['radius'];material(stone['ground_contact_seconds'],.045+radius*.012,450,4800/radius**.35,.014+radius*.004,float(np.clip((stone['x']/720-.5)*1.4,-.8,.8)))
  n=round(.8*RATE);t=np.arange(n)/RATE;add(.68,colored(rng,n,400,2800)*(t/.8)**2*.018,1)
  first_contact=impact
 else:first_contact=None
 # All release tails are quiet before the common studio handoff.
 fade=np.ones(len(audio));start=int(19.25*RATE);fade[start:]=np.linspace(1,0,len(audio)-start);audio*=fade[:,None]
 return audio,{'scene':scene,'version':'material-front-v2','method':'Material-filtered granular synthesis driven by the actual reconstruction front; VFX stone collision times drive matching impacts.','seed':seed,'sample_rate':RATE,'grain_count':grain_count,'visual_front_events':len(events),'impact_seconds':first_contact,'external_samples':False,'generation_cost_usd':0}

def write_wave(path,audio):
 peak=np.max(np.abs(audio));audio*=min(1,.9/max(peak,1e-8))
 with wave.open(str(path),'wb') as wav:wav.setnchannels(2);wav.setsampwidth(2);wav.setframerate(RATE);wav.writeframes(np.round(np.clip(audio,-1,1)*32767).astype('<i2').tobytes())

def main(scene):
 folder=VIDEO/scene;source=folder/'intro-vertical-drop.mp4' if scene=='intro' else folder/'mobile'/f'{scene}.mp4'
 destination=source
 previous=folder/'procedural-audio.json'
 if scene!='intro' and previous.exists():
  saved=json.loads(previous.read_text())
  if saved.get('output_sha256')==hashlib.sha256(source.read_bytes()).hexdigest():
   if saved.get('version')=='material-front-v2':print(scene,'verified existing procedural mix');return
   original=folder/'audio-base'/(saved['visual_source_sha256'][:16]+'.mp4')
   assert original.exists();source=original
 audio,recipe=synth(scene,source);recipe['visual_source_sha256']=hashlib.sha256(source.read_bytes()).hexdigest()
 if scene=='intro':
  write_wave(folder/'effects.wav',audio);(folder/'effects.json').write_text(json.dumps(recipe,indent=2)+'\n');print(scene,recipe['grain_count'],'procedural grains and collision foley ready');return
 native_dir=folder/'audio-base';native_dir.mkdir(exist_ok=True);native=native_dir/(recipe['visual_source_sha256'][:16]+'.mp4')
 if not native.exists():native.write_bytes(source.read_bytes())
 raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(native),'-map','0:a:0','-ar',str(RATE),'-ac','2','-f','f32le','-'])
 bed=np.frombuffer(raw,np.float32).reshape(-1,2);count=min(len(audio),len(bed));time=np.arange(count)/RATE;level=np.ones(count)
 for start,end in [(.15,4.6),(13.4,19.6)]:
  inside=np.minimum(np.clip((time-start)/.2,0,1),np.clip((end-time)/.2,0,1));level*=1-inside*.68
 audio[:count]+=bed[:count]*level[:,None]
 with tempfile.TemporaryDirectory() as directory:
  wav=Path(directory)/'procedural.wav';write_wave(wav,audio);temp=folder/'mobile'/f'{scene}-sound.mp4'
  subprocess.run(['ffmpeg','-v','error','-y','-i',str(native),'-i',str(wav),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-ar','48000','-b:a','192k','-af','loudnorm=I=-16:TP=-1.5:LRA=11','-t','20','-movflags','+faststart',str(temp)],check=True);temp.replace(destination)
 recipe['output_sha256']=hashlib.sha256(destination.read_bytes()).hexdigest();(folder/'procedural-audio.json').write_text(json.dumps(recipe,indent=2)+'\n');print(scene,recipe['grain_count'],'procedural grains mixed; vehicle frames stream-copied')

if __name__=='__main__':
 import sys
 for scene in sys.argv[1:]:
  if scene not in ('intro','cargo','storm','xtrek'):raise ValueError('Only the explicitly corrected scenes use this mix; Vadeo audio remains unchanged.')
  main(scene)
