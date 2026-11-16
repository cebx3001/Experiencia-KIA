"""Offline editorial pass over the completed intro; never calls a generation API."""
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/tasman/video/intro'
EDIT_VERSION = 'landing-master-v1'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    raw, master, final = (OUT / name for name in ['intro-source.mp4', 'master.png', 'intro.mp4'])
    if not raw.exists():
        raise RuntimeError('No completed Seedance source: this step never substitutes another clip')
    request = json.loads((OUT / 'request-summary.json').read_text())
    assert sha(master) == request['master_sha256'], 'The fixed master must not change'
    if final.exists() and (OUT / 'edit.json').exists() and (OUT / 'validation.json').exists():
        previous = json.loads((OUT / 'edit.json').read_text())
        validation = json.loads((OUT / 'validation.json').read_text())
        if (previous.get('version') == EDIT_VERSION and previous.get('source_sha256') == sha(raw)
                and previous.get('master_sha256') == sha(master) and validation.get('sha256') == sha(final)):
            print('Verified edited intro reused; no encoding or generation repeated.')
            return
    # Keep all three actions and the complete orbit. Accelerate only the overly slow
    # descent/settling; the orbit and scan retain their original frame cadence.
    filters = (
        '[0:v]split=3[x][y][z];'
        '[x]trim=start=0:end=3,setpts=(PTS-STARTPTS)/4,fps=24[a];'
        '[y]trim=start=3:end=7.5,setpts=(PTS-STARTPTS)/2,fps=24[b];'
        '[z]trim=start=7.5,setpts=PTS-STARTPTS,fps=24[c];'
        '[a][b][c]concat=n=3:v=1:a=0,settb=AVTB[base];'
        '[1:v]scale=1280:720,setsar=1,fps=24,settb=AVTB,trim=duration=1[master];'
        '[base][master]xfade=transition=fade:duration=0.5:offset=19,trim=duration=20,format=yuv420p[v]'
    )
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(raw), '-loop', '1', '-i', str(master),
                    '-filter_complex', filters, '-map', '[v]', '-an', '-c:v', 'libx264', '-preset', 'medium',
                    '-crf', '18', '-movflags', '+faststart', str(final)], check=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-i', str(final), '-f', 'null', '-'], check=True)
    probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(final)]))
    video = next(s for s in probe['streams'] if s['codec_type'] == 'video')
    duration = float(probe['format']['duration'])
    assert video['width'] == 1280 and video['height'] == 720 and abs(duration - 20) < .1
    for frame in OUT.glob('review-*.jpg'):
        frame.unlink()
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(final), '-vf', 'fps=1,scale=480:-1', str(OUT / 'review-%02d.jpg')], check=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-sseof', '-0.05', '-i', str(final), '-frames:v', '1', str(OUT / 'last-frame.png')], check=True)
    edit = {'version': EDIT_VERSION, 'generation_duration_seconds': request['duration'], 'delivery_duration_seconds': duration,
            'source_sha256': sha(raw), 'master_sha256': sha(master), 'new_generations_submitted': 0,
            'timing': [{'source': [0, 3], 'speed': 4}, {'source': [3, 7.5], 'speed': 2}, {'source': [7.5, 24.041667], 'speed': 1}],
            'master_match': {'method': 'Half-second match dissolve during the settled pose; exact master held at the end', 'start_seconds': 19, 'full_master_since_seconds': 19.5},
            'audio': False}
    (OUT / 'edit.json').write_text(json.dumps(edit, indent=2) + '\n')
    validation = {'decodable': True, 'codec': video['codec_name'], 'width': video['width'], 'height': video['height'],
                  'duration': duration, 'bytes': final.stat().st_size, 'sha256': sha(final), 'audio': False,
                  'visual_review': 'PENDING human approval: edited landing, full orbit, scanning band and full-color digital twin',
                  'physical_mobile_test': False, 'editing': 'edit.json'}
    (OUT / 'validation.json').write_text(json.dumps(validation, indent=2) + '\n')
    print(json.dumps(validation))


if __name__ == '__main__':
    main()
