"""Assemble the existing mobile exports and image explorer. No API requests."""
import hashlib
import json
from pathlib import Path
import shutil
from PIL import Image,ImageChops

ROOT=Path(__file__).resolve().parents[2]
VIDEO=ROOT/'docs/tasman/video'
OUT=ROOT/'experiencia-video'
RELEASE='tasman-mobile-video-20261116-r2'


def main():
    (OUT/'media').mkdir(exist_ok=True)
    for scene in ('intro','xtrek','vadeo','storm','cargo','trailer','interior'):
        shutil.copy2(VIDEO/scene/'mobile'/f'{scene}.mp4',OUT/'media'/f'{scene}.mp4')
    shutil.copytree(VIDEO/'spin',OUT/'spin',dirs_exist_ok=True)
    shutil.copy2(VIDEO/'shared/master-vertical.png',OUT/'media/master.png')
    shutil.copy2(ROOT/'assets/kia-logo.svg',OUT/'media/kia-logo.svg')
    opening=Image.open(VIDEO/'intro/opening.png').convert('RGB').resize((720,406),Image.Resampling.LANCZOS)
    portrait=Image.new('RGB',(720,1280),'black');portrait.paste(opening,(0,437));portrait.save(OUT/'media/opening.png')
    for name in ('master','opening'):
        source=OUT/f'media/{name}.png';dest=source.with_suffix('.webp');Image.open(source).save(dest,'WEBP',lossless=True,method=6)
        assert ImageChops.difference(Image.open(source).convert('RGB'),Image.open(dest).convert('RGB')).getbbox() is None
    manifest={'release':RELEASE,'files':{}}
    for path in sorted(OUT.rglob('*')):
        if path.is_file() and path.name not in ('public-manifest.json','browser-review.json'):
            manifest['files'][str(path.relative_to(OUT))]=hashlib.sha256(path.read_bytes()).hexdigest()
    (OUT/'public-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print('Prepared',RELEASE,'with',len(manifest['files']),'public files; no generation.')


if __name__=='__main__':main()
