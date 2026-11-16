"""Original deterministic effects, synthesized locally; no external asset or API."""
import json
from pathlib import Path
import wave
import numpy as np

RATE=48000
ROOT=Path(__file__).resolve().parents[2]


def render(scene,out):
    rng=np.random.default_rng(20261116)
    audio=np.zeros((RATE*20,2),dtype=np.float64)
    def add(start,duration,kind,gain,pan=0,frequency=100):
        n=int(duration*RATE);t=np.arange(n)/RATE
        noise=rng.normal(0,1,n)
        if kind=='thud':
            y=(np.sin(2*np.pi*(frequency*t-20*t*t))+.45*np.sin(2*np.pi*230*t))*np.exp(-t*13)+.2*noise*np.exp(-t*65)
        elif kind=='grain':
            y=(noise-np.roll(noise,1))*np.exp(-t*75)
        elif kind=='gravel':
            y=np.convolve(noise,np.ones(9)/9,mode='same')*np.exp(-t*8)
        elif kind=='engine':
            y=(np.sin(2*np.pi*frequency*t)+.5*np.sin(2*np.pi*frequency*2*t)+.3*np.sin(2*np.pi*frequency*5*t))*.45
            y*=np.minimum(t*5,1)*np.minimum((duration-t)*5,1)
        else:
            y=np.convolve(noise,np.ones(4)/4,mode='same')*np.sin(np.pi*t/duration)**2
        y*=gain;left=np.sqrt((1-pan)/2);right=np.sqrt((1+pan)/2)
        a=int(start*RATE);b=min(a+n,len(audio));audio[a:b,0]+=y[:b-a]*left;audio[a:b,1]+=y[:b-a]*right
    if scene=='intro':
        impact=14/24
        add(impact,.7,'thud',.62,frequency=94)
        add(impact+.04,.65,'gravel',.23)
        add(impact+.12,1.2,'air',.08)
        for start in (.73,.84,1.01,1.24):add(start,.09,'grain',.06,rng.uniform(-.8,.8))
        for start in np.arange(13.7,17.85,.075):
            add(float(start),.07,'grain',.013,float((start-15.8)/2.4))
        add(13.7,4.3,'air',.018)
        marks={'first_contact_seconds':impact,'scan_seconds':[13.7,18.0]}
    elif scene=='xtrek':
        for start in np.arange(.7,5.1,.11):add(float(start),.065,'grain',.018,rng.uniform(-.7,.7))
        add(5.3,9.8,'engine',.08,frequency=58)
        for start in np.arange(5.4,15.1,.15):add(float(start),.12,'gravel',.025,rng.uniform(-.7,.7))
        for start in (7.1,8.5,10.2,12.8):add(start,.3,'thud',.09,frequency=135)
        for start in np.arange(15.5,18.9,.13):add(float(start),.07,'grain',.015,rng.uniform(-.6,.6))
        marks={'assembly_seconds':[.7,5.1],'action_seconds':[5.3,15.1],'disassembly_seconds':[15.5,18.9],'sync_status':'Draft effects timing; obstacle traversal remains visually pending.'}
    else:raise ValueError(scene)
    peak=np.max(np.abs(audio));audio*=min(1,.80/max(peak,1e-9))
    out.parent.mkdir(exist_ok=True)
    with wave.open(str(out),'wb') as wav:
        wav.setnchannels(2);wav.setsampwidth(2);wav.setframerate(RATE);wav.writeframes((audio*32767).astype('<i2').tobytes())
    (out.with_suffix('.json')).write_text(json.dumps({'original_local_synthesis':True,'license':'Original project sound design','scene':scene,'sample_rate':RATE,'seconds':20,'cost_usd':0,'sync':marks},indent=2)+'\n')


if __name__=='__main__':
    for scene in ('intro','xtrek'):render(scene,ROOT/f'docs/tasman/video/{scene}/effects.wav')
