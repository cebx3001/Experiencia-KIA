"""Export the existing paid X-TREK render. No generation or API calls."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[2]
SCENE = ROOT / 'docs/tasman/video/xtrek'
OUT = SCENE / 'delivery'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    OUT.mkdir(exist_ok=True)
    source = SCENE / 'attempts/01-insufficient-travel/xtrek.mp4'
    master = ROOT / 'docs/tasman/video/intro/master.png'
    graph = (
        '[0:v]split=3[x][y][z];[x]trim=0:8,setpts=(PTS-STARTPTS)/4,fps=24[a0];'
        '[y]trim=8:22,setpts=(PTS-STARTPTS)/2.54545454545,fps=24[b0];'
        '[z]trim=22:30,setpts=(PTS-STARTPTS)/3.2,fps=24[c0];'
        '[a0][b0][c0]concat=n=3:v=1:a=0,format=yuv420p[base];'
        '[1:v]scale=1280:720,format=rgba,split=2[s][e];'
        '[s]trim=duration=0.5,setpts=PTS-STARTPTS,fade=t=out:st=0.15:d=0.25:alpha=1[start];'
        '[e]trim=duration=0.5,setpts=PTS-STARTPTS+9.5/TB,fade=t=in:st=9.5:d=0.25:alpha=1[end];'
        '[base][start]overlay=eof_action=pass[a];[a][end]overlay=eof_action=pass[v]'
    )
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(source), '-loop', '1', '-i', str(master),
                    '-filter_complex', graph, '-map', '[v]', '-t', '10', '-an', '-c:v', 'libx264', '-preset', 'fast',
                    '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(OUT / 'xtrek.mp4')], check=True)
    shutil.copy2(source, OUT / 'xtrek-original.mp4')
    shutil.copy2(master, OUT / 'master.png')
    subprocess.run(['ffmpeg', '-v', 'error', '-i', str(OUT / 'xtrek.mp4'), '-f', 'null', '-'], check=True)
    report = {'state': 'EN VALIDACIÓN', 'duration_seconds': 10, 'generated_source_seconds': 30,
              'width': 1280, 'height': 720, 'audio': False, 'additional_paid_generations': 0,
              'source_sha256': digest(source), 'master_sha256': digest(master),
              'endpoint_edit': 'The same master file is encoded at both endpoints; short match fades preserve the handoff.',
              'limitations': 'First visual proposal; obstacle travel and procedural disassembly remain for client review. No corrected render was created.'}
    (OUT / 'review.json').write_text(json.dumps(report, indent=2) + '\n')
    names = ['index.html', 'xtrek.mp4', 'xtrek-original.mp4', 'master.png', 'review.json']
    manifest = {'release': 'tasman-xtrek-review02', 'files': {n: digest(OUT / n) for n in names}}
    (OUT / 'public-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps(report))


if __name__ == '__main__':
    main()
