"""Assemble the existing mobile exports and image explorer. No API requests."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
from PIL import Image,ImageChops

ROOT=Path(__file__).resolve().parents[2]
VIDEO=ROOT/'docs/tasman/video'
OUT=ROOT/'experiencia-video'
RELEASE='tasman-mobile-video-20261116-r5'


def main():
    (OUT/'media').mkdir(exist_ok=True)
    for scene in ('intro','xtrek','vadeo','storm','cargo','trailer','interior'):
        shutil.copy2(VIDEO/scene/'mobile'/f'{scene}.mp4',OUT/'media'/f'{scene}.mp4')
    shutil.copytree(VIDEO/'spin',OUT/'spin',dirs_exist_ok=True)
    shutil.copy2(VIDEO/'shared/master-vertical.png',OUT/'media/master.png')
    shutil.copy2(ROOT/'assets/kia-logo.svg',OUT/'media/kia-logo.svg')
    floor=VIDEO/'intro/drop-floor-vertical.png'
    if floor.exists():portrait=Image.open(floor).convert('RGB')
    else:
        opening=Image.open(VIDEO/'intro/opening.png').convert('RGB').resize((720,406),Image.Resampling.LANCZOS)
        portrait=Image.new('RGB',(720,1280),'black');portrait.paste(opening,(0,437))
    portrait.save(OUT/'media/opening.png')
    subprocess.run(['ffmpeg','-v','error','-y','-sseof','-0.1','-i',str(OUT/'media/intro.mp4'),'-vf','reverse','-frames:v','1',str(OUT/'media/scan-handoff.png')],check=True)
    handoff=Image.open(OUT/'media/scan-handoff.png').convert('RGB');handoff.save(OUT/'media/scan-handoff.webp','WEBP',lossless=True,method=6)
    handoff.crop((0,437,720,843)).resize((960,540),Image.Resampling.LANCZOS).save(OUT/'spin/scan-frames/45.webp','WEBP',lossless=True,method=6)
    spin_manifest=OUT/'spin/scan-frames.json'
    if spin_manifest.exists():
        data=json.loads(spin_manifest.read_text());data['handoff_anchor']='Final encoded intro frame, same pose and appearance as displayed video'
        for frame in data['frames']:
            if frame['angle_index']==45:frame['sha256']=hashlib.sha256((OUT/'spin/scan-frames/45.webp').read_bytes()).hexdigest()
        spin_manifest.write_text(json.dumps(data,indent=2)+'\n')
    cues=json.loads((VIDEO/'intro/drop-composite.json').read_text()) if (VIDEO/'intro/drop-composite.json').exists() else {'impact_seconds':14/24}
    (OUT/'media-cues.js').write_text('export const mediaCues = '+json.dumps({'introImpactSeconds':cues['impact_seconds'],'introHandoffSeconds':19.5})+';\n')
    for name in ('master','opening'):
        source=OUT/f'media/{name}.png';dest=source.with_suffix('.webp');Image.open(source).save(dest,'WEBP',lossless=True,method=6)
        assert ImageChops.difference(Image.open(source).convert('RGB'),Image.open(dest).convert('RGB')).getbbox() is None
    checks=[]
    for clip in sorted((OUT/'media').glob('*.mp4')):
        probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(clip)]))
        video=next(s for s in probe['streams'] if s['codec_type']=='video');audio=next(s for s in probe['streams'] if s['codec_type']=='audio')
        assert (video['width'],video['height'])==(720,1280) and abs(float(probe['format']['duration'])-20)<.05
        checks.append({'file':clip.name,'width':720,'height':1280,'duration':float(probe['format']['duration']),'audio':audio['codec_name'],'sample_rate':audio['sample_rate'],'bytes':clip.stat().st_size,'sha256':hashlib.sha256(clip.read_bytes()).hexdigest()})
    (OUT/'media-validation.json').write_text(json.dumps({'passed':True,'clips':checks},indent=2)+'\n')
    manifest={'release':RELEASE,'files':{}}
    for path in sorted(OUT.rglob('*')):
        if path.is_file() and path.name not in ('public-manifest.json','browser-review.json'):
            manifest['files'][str(path.relative_to(OUT))]=hashlib.sha256(path.read_bytes()).hexdigest()
    (OUT/'public-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print('Prepared',RELEASE,'with',len(manifest['files']),'public files; no generation.')


if __name__=='__main__':main()
