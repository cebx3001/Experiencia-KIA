"""Original descending fall whistle + weighty impact. No service or stock samples.
Only the first 2.8 seconds are mixed; later scan PCM remains the accepted mix.
"""
import hashlib,json,subprocess,wave
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[2];FOLDER=ROOT/'docs/tasman/video/intro';RATE=48000

def main():
 base=FOLDER/'shadow-base/intro-r5.mp4';source=FOLDER/'intro-shadow-clean.mp4'
 data=subprocess.check_output(['ffmpeg','-v','error','-i',str(base),'-map','0:a:0','-ar',str(RATE),'-ac','2','-f','f32le','-']);audio=np.frombuffer(data,np.float32).reshape(-1,2).copy();original=audio.copy();rng=np.random.default_rng(2026111606)
 def noise(n,lo,hi):
  f=np.fft.rfftfreq(n,1/RATE);x=np.fft.rfft(rng.normal(size=n));x*=np.exp(-(f/hi)**4)*(1-np.exp(-(f/lo)**4));y=np.fft.irfft(x,n=n);return y/max(np.sqrt(np.mean(y*y)),1e-8)
 def add(at,x,gain):
  start=round(at*RATE);end=min(len(audio),start+len(x));audio[start:end]+=x[:end-start,None]*gain
 duration=1.22;n=round(duration*RATE);t=np.arange(n)/RATE;u=t/duration;freq=2200*(430/2200)**u;phase=np.cumsum(2*np.pi*freq/RATE)
 envelope=np.sin(np.pi*np.clip(u,0,.999))**.25*u**1.55;envelope*=np.clip((duration-t)/.012,0,1)
 whistle=(np.sin(phase)+.12*np.sin(phase*2))*envelope;air=noise(n,700,5300)*u**2*np.clip((duration-t)/.018,0,1)
 add(.27,whistle,.10);add(.27,air,.065)
 n=round(.85*RATE);t=np.arange(n)/RATE;attack=(1-np.exp(-t/.0015));body=noise(n,45,950)*attack*np.exp(-t/0.12)
 body+=.30*np.sin(2*np.pi*87*t)*np.exp(-t*12)+.17*np.sin(2*np.pi*174*t)*np.exp(-t*18)
 add(1.5,body,.23);add(1.5,noise(n,700,3500)*attack*np.exp(-t/.025),.085)
 end=round(2.8*RATE);peak=np.max(np.abs(audio[:end]));ceiling=.94
 if peak>ceiling:
  # Limit only the new fall/impact region; retain the already accepted scan mix.
  x=audio[:end];audio[:end]=np.sign(x)*np.where(np.abs(x)<=.72,np.abs(x),.72+.22*np.tanh((np.abs(x)-.72)/.22))
 assert np.array_equal(audio[end:],original[end:]);wav=FOLDER/'fall-impact-r6.wav'
 with wave.open(str(wav),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(RATE);w.writeframes(np.round(np.clip(audio,-1,1)*32767).astype('<i2').tobytes())
 out=FOLDER/'intro-final-r6.mp4';subprocess.run(['ffmpeg','-v','error','-y','-i',str(source),'-i',str(wav),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-ar','48000','-b:a','192k','-t','20','-movflags','+faststart',str(out)],check=True)
 (FOLDER/'fall-impact-r6.json').write_text(json.dumps({'source_audio_sha256':hashlib.sha256(base.read_bytes()).hexdigest(),'method':'Original descending pitched air whistle and layered material impact; no paid audio or stock samples.','whistle_seconds':[.27,1.49],'impact_seconds':1.5,'mix_changes_end_seconds':2.8,'later_scan_pcm_unchanged_before_encoding':True,'animation_modified':False,'new_generation_cost_usd':0,'output_sha256':hashlib.sha256(out.read_bytes()).hexdigest()},indent=2)+'\n');print('Fall whistle and heavier impact mixed; animation and scan sound preserved.')
if __name__=='__main__':main()
