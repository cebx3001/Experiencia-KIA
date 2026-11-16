"""Package the existing Cargo proposal for Pages. No generation/API calls."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[2]
SCENE = ROOT / 'docs/tasman/video/cargo'
OUT = SCENE / 'delivery'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    source = SCENE / 'cargo.mp4'
    validation = json.loads((SCENE / 'validation.json').read_text())
    assert digest(source) == validation['sha256'], 'Output changed after validation'
    assert min(validation['raw_endpoint_similarity'].values()) >= .94
    info = json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(source)]))
    video = next(s for s in info['streams'] if s['codec_type'] == 'video')
    assert abs(float(info['format']['duration']) - 20) < .05
    assert (video['width'], video['height']) == (1280, 720)
    assert any(s['codec_type'] == 'audio' for s in info['streams'])
    subprocess.run(['ffmpeg', '-v', 'error', '-i', str(source), '-f', 'null', '-'], check=True)
    OUT.mkdir(exist_ok=True)
    shutil.copy2(source, OUT / 'cargo.mp4')
    shutil.copy2(ROOT / 'docs/tasman/video/intro/master.png', OUT / 'master.png')
    review = json.loads((SCENE / 'visual-review.json').read_text())
    assert review['reviewed_source_sha256'] == digest(SCENE / 'cargo-source.mp4')
    report = {'state': 'EN VALIDACIÓN', 'generated_source_seconds': 10, 'duration_seconds': 20,
              'width': 1280, 'height': 720, 'audio': True,
              'additional_paid_generations_for_edit': 0,
              'master_sha256': digest(OUT / 'master.png'),
              'endpoint_similarity': validation['raw_endpoint_similarity'],
              'visual_review': review,
              'limitations': 'Propuesta generada, pendiente de aprobación del cliente; 10 segundos nativos a 20 segundos editoriales.'}
    (OUT / 'review.json').write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n')
    files = ['index.html', 'cargo.mp4', 'master.png', 'review.json']
    manifest = {'release': 'tasman-cargo-review01', 'files': {n: digest(OUT / n) for n in files}}
    (OUT / 'public-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps({'packaged': True, 'duration': 20, 'audio': True}))


if __name__ == '__main__':
    main()
