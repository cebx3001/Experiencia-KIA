"""Free, reproducible portrait packaging of existing footage. No API requests."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[2]
VIDEO=ROOT/'docs/tasman/video'
TITLES={'intro':'Introducción','xtrek':'X-TREK','vadeo':'Vadeo','storm':'Storm','cargo':'Carga en la paila','trailer':'Remolque','interior':'Interior y tecnología'}


def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()


def package(scene):
    if scene not in TITLES:raise ValueError('Unknown scene')
    folder=VIDEO/scene;out=folder/'mobile';out.mkdir(exist_ok=True)
    source=folder/f'{scene}.mp4'
    if scene=='xtrek' and not source.exists():source=folder/'attempts/01-insufficient-travel/xtrek.mp4'
    if scene=='intro' and (folder/'intro-vertical-drop.mp4').exists():source=folder/'intro-vertical-drop.mp4'
    if scene=='vadeo' and (folder/'vadeo-cyan.mp4').exists():source=folder/'vadeo-cyan.mp4'
    if scene=='trailer' and (folder/'trailer-roof-clean.mp4').exists():source=folder/'trailer-roof-clean.mp4'
    probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(source)]))
    duration=float(probe['format']['duration']);rate=duration/20
    stream=next(s for s in probe['streams'] if s['codec_type']=='video')
    local_effects=folder/'effects.wav' if scene=='intro' else None
    audio=any(s['codec_type']=='audio' for s in probe['streams']) or bool(local_effects and local_effects.exists())
    vf=[]
    if abs(rate-1)>.001:
        vf+=[f'setpts=(PTS-STARTPTS)/{rate}', 'minterpolate=fps=24:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1','tpad=stop_mode=clone:stop_duration=0.25']
    if stream['height']>stream['width']:vf+=['scale=720:1280']
    else:vf+=['scale=720:406','pad=720:1280:0:437:black']
    inputs=['-i',str(source)]+(['-i',str(local_effects)] if local_effects and local_effects.exists() else [])
    audio_map='1:a:0' if local_effects and local_effects.exists() else '0:a?'
    if len(vf)>3 and 'minterpolate' in vf[1]:
        resizing=[f for f in vf if f.startswith('scale=')]
        vf=resizing+[f for f in vf if not f.startswith('scale=')]
    command=['ffmpeg','-v','error','-y',*inputs,'-map','0:v:0','-map',audio_map,'-vf',','.join(vf),'-t','20','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p']
    if audio:
        af='loudnorm=I=-18:TP=-1.5:LRA=11' if local_effects else (f'atempo={rate},loudnorm=I=-18:TP=-1.5:LRA=11' if abs(rate-1)>.001 else 'anull')
        command+=['-af',af,'-c:a','aac','-ar','48000','-b:a','192k']
    command+=['-movflags','+faststart',str(out/f'{scene}.mp4')]
    if stream['width']==720 and stream['height']==1280 and abs(rate-1)<.001:
        if local_effects:
            subprocess.run(['ffmpeg','-v','error','-y','-i',str(source),'-i',str(local_effects),'-map','0:v:0','-map','1:a:0','-c:v','copy','-af','loudnorm=I=-16:TP=-1.5:LRA=11','-c:a','aac','-ar','48000','-b:a','192k','-t','20','-movflags','+faststart',str(out/f'{scene}.mp4')],check=True)
        else:shutil.copy2(source,out/f'{scene}.mp4')
    else:subprocess.run(command,check=True)
    subprocess.run(['ffmpeg','-v','error','-i',str(out/f'{scene}.mp4'),'-f','null','-'],check=True)
    result=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(out/f'{scene}.mp4')]))
    actual=next(s for s in result['streams'] if s['codec_type']=='video')
    assert (actual['width'],actual['height'])==(720,1280) and abs(float(result['format']['duration'])-20)<.05
    shutil.copy2(VIDEO/'shared/master-vertical.png',out/'master.png')
    template=(ROOT/'tools/tasman-preview/mobile-player.html').read_text()
    (out/'index.html').write_text(template.replace('{{TITLE}}',TITLES[scene]).replace('{{SCENE}}',scene).replace('{{AUDIO}}','Sonido integrado' if audio else 'Propuesta visual sin sonido'))
    report={'state':'EN VALIDACIÓN','scene':scene,'duration_seconds':20,'width':720,'height':1280,'audio':audio,'source_sha256':digest(source),'video_sha256':digest(out/f'{scene}.mp4'),'additional_paid_generation':False,'framing':'Native portrait' if stream['height']>stream['width'] else 'Entire existing landscape shot preserved within a portrait black studio canvas; no cropping or generated extensions','limitations':[]}
    if (folder/'visual-review.json').exists():report['visual_review']=json.loads((folder/'visual-review.json').read_text())
    if scene=='storm':report['feature']='Control Electrónico de Estabilidad (ESC), according to the official Ecuador specification; not a selectable rain mode.'
    if scene=='xtrek':report['visual_review_required']='Continuous rocky route, supports, suspension and vehicle identity.'
    if scene=='trailer':report['limitations']=['Condicionamiento histórico sin anclas explícitas de extremos: comparar continuidad de identidad durante la apertura y el cierre.']
    (out/'review.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
    files=['index.html',f'{scene}.mp4','master.png','review.json']
    manifest={'release':f'tasman-{scene}-mobile-review01','files':{name:digest(out/name) for name in files}}
    (out/'public-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(json.dumps({'scene':scene,'portrait':True,'duration':20,'audio':audio}))


if __name__=='__main__':
    for scene in sys.argv[1:]:package(scene)
