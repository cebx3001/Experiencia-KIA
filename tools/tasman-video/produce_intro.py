"""Server-side production. Credentials never enter requests saved to disk or web files."""
import base64
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import subprocess
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/tasman/video/intro'
API = 'https://openrouter.ai/api/v1'


def write(name, value):
    (OUT / name).write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n')


def request(url, *, authenticated=False, payload=None):
    headers = {'User-Agent': 'Experiencia-KIA-intro-production/1.0'}
    if authenticated:
        headers['Authorization'] = 'Bearer ' + os.environ['OPENROUTER_API_KEY']
    data = None
    if payload is not None:
        headers['Content-Type'] = 'application/json'
        data = json.dumps(payload).encode()
    try:
        with urllib.request.urlopen(urllib.request.Request(url, data=data, headers=headers), timeout=180) as res:
            return res.read()
    except urllib.error.HTTPError as exc:
        # Avoid publishing signed URLs, credentials, or arbitrary provider error bodies.
        raise RuntimeError(f'HTTP {exc.code}: {urllib.parse.urlsplit(url).hostname}') from None


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def media(path, kind):
    mime = 'image/png' if kind == 'image' else 'video/mp4'
    url = 'data:' + mime + ';base64,' + base64.b64encode(path.read_bytes()).decode()
    return {'type': kind + '_url', kind + '_url': {'url': url}}


def orbit_guide():
    """Original Kia sequence; temporary PNGs are not extra website downloads."""
    guide = OUT / 'orbit-guide.mp4'
    if guide.exists():
        return
    with tempfile.TemporaryDirectory() as folder:
        folder = Path(folder)
        hashes = []
        for i in range(72):
            angle = (45 + i) % 72
            name = f'Tan-Beige_TAM_{angle:02}.png'
            local = OUT / 'references' / name
            url = 'https://www.kia.com/content/dam/kwcms/gt/en/images/showroom/Tasman-TK-26my/Features/360vr/ext/tan-beige/' + name
            content = local.read_bytes() if local.exists() else request(url)
            if not content.startswith(b'\x89PNG\r\n\x1a\n'):
                raise RuntimeError(f'PNG oficial inválido: {name}')
            (folder / f'{i:03}.png').write_bytes(content)
            hashes.append({'angle': angle, 'url': url, 'sha256': hashlib.sha256(content).hexdigest()})
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'lavfi', '-i',
                        'color=c=black:s=960x540:r=12', '-framerate', '12', '-i', str(folder / '%03d.png'),
                        '-filter_complex', '[0:v][1:v]overlay=(W-w)/2:(H-h)/2:shortest=1,format=yuv420p[v]',
                        '-map', '[v]', '-frames:v', '72', '-c:v', 'libx264', '-crf', '20', '-movflags', '+faststart', str(guide)], check=True)
        write('orbit-guide-sources.json', {'fps': 12, 'duration': 6, 'purpose': 'Geometry/camera reference, not the deliverable intro', 'frames': hashes})


def build_payload(config, model):
    if model['id'] != config['model_id']:
        raise RuntimeError('El modelo seleccionado no coincide con la configuración')
    for field, supported in [('duration', 'supported_durations'), ('resolution', 'supported_resolutions'), ('aspect_ratio', 'supported_aspect_ratios')]:
        if config[field] not in (model.get(supported) or []):
            raise RuntimeError(f'Valor no admitido por {model["id"]}: {field}')
    if not {'first_frame', 'last_frame'}.issubset(model.get('supported_frame_images') or []):
        raise RuntimeError('No hay control de ambos extremos; no se envía una toma sin maestro')
    frames = []
    for name, frame_type in [('opening.png', 'first_frame'), ('master.png', 'last_frame')]:
        part = media(OUT / name, 'image')
        part['frame_type'] = frame_type
        frames.append(part)
    # Seven factory angles plus the master based on angle 45: all eight sides are represented.
    # Nine image inputs total, including both endpoints. Three motion guides total 14.25 seconds.
    refs = [media(p, 'image') for p in sorted((OUT / 'references').glob('*.png')) if p.name != 'Tan-Beige_TAM_45.png']
    guides = [ROOT / 'docs/tasman/evidence/revision-03/impact.mp4', OUT / 'orbit-guide.mp4', ROOT / 'docs/tasman/evidence/revision-03/scan.mp4']
    refs += [media(p, 'video') for p in guides]
    payload = {key: config[key] for key in ['duration', 'resolution', 'aspect_ratio']}
    payload.update(model=model['id'], prompt=(OUT / 'prompt.txt').read_text(), frame_images=frames,
                   input_references=refs, generate_audio=True)
    if model.get('seed'):
        payload['seed'] = config['seed']
    return payload


def safe_job(job):
    # In particular, do not persist the signed output URLs returned by the service.
    return {key: job[key] for key in ['id', 'status', 'generation_id', 'usage'] if key in job}


def generate(config):
    model = json.loads((OUT / 'selected-model.json').read_text())
    # A finished file/receipt is reused; workflow reruns must not spend credits again.
    final = OUT / 'intro.mp4'
    if final.exists() and (OUT / 'validation.json').exists():
        print('Entrega existente: no se envía otro trabajo de pago.')
        return
    orbit_guide()
    payload = build_payload(config, model)
    request_hash = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
    write('request-summary.json', {
        'model': model['id'], 'duration': payload['duration'], 'resolution': payload['resolution'],
        'aspect_ratio': payload['aspect_ratio'], 'seed': payload.get('seed'), 'request_sha256': request_hash,
        'master_sha256': digest(OUT / 'master.png'), 'opening_sha256': digest(OUT / 'opening.png'),
        'image_references': 7, 'video_guides': 3, 'approval': 'EN VALIDACIÓN', 'next_video_authorized': False,
    })
    if not os.environ.get('OPENROUTER_API_KEY'):
        raise RuntimeError('Actions recibió OPENROUTER_API_KEY vacío. Vincular el Environment que lo contiene o guardar el secreto a nivel de este repositorio. No se ha enviado ningún trabajo de pago.')
    receipt = OUT / 'job.json'
    intent = OUT / 'submission-intent.json'
    if receipt.exists():
        record = json.loads(receipt.read_text())
        if record.get('request_sha256') != request_hash:
            raise RuntimeError('Ya existe una generación con otros extremos/parámetros; no se sustituye ni se cobra automáticamente')
        job = record['job']
    else:
        if intent.exists():
            raise RuntimeError('Existe un intento sin recibo: comprobar el proveedor antes de reenviar para evitar un doble cargo')
        write('submission-intent.json', {'request_sha256': request_hash, 'automatic_resubmission': False})
        # Exactly one POST; there is deliberately no automatic retry of a paid submission.
        job = json.loads(request(API + '/videos', authenticated=True, payload=payload))
        if not re.fullmatch(r'[A-Za-z0-9_-]+', job.get('id', '')):
            raise RuntimeError('El proveedor no devolvió un identificador válido; no se repite el envío')
        write('job.json', {'request_sha256': request_hash, 'job': safe_job(job)})
    deadline = time.monotonic() + 30 * 60
    while job.get('status') != 'completed':
        if job.get('status') in ['failed', 'cancelled', 'expired']:
            raise RuntimeError(f'El trabajo {job["id"]} terminó como {job["status"]}; revisar en OpenRouter, sin regeneración automática')
        if time.monotonic() > deadline:
            raise RuntimeError('Generación todavía pendiente; volver a ejecutar continúa el mismo trabajo sin volver a pagarlo')
        print('Seedance:', job.get('status'), flush=True)
        time.sleep(15)
        job = json.loads(request(API + '/videos/' + job['id'], authenticated=True))
        write('job.json', {'request_sha256': request_hash, 'job': safe_job(job)})
    raw = OUT / 'intro-source.mp4'
    raw.write_bytes(request(API + '/videos/' + job['id'] + '/content', authenticated=True))
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(raw), '-map', '0:v:0', '-map', '0:a?',
                    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
                    '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', str(final)], check=True)
    probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(final)]))
    video = next(s for s in probe['streams'] if s['codec_type'] == 'video')
    duration = float(probe['format']['duration'])
    if video['width'] != 1280 or video['height'] != 720 or abs(duration - config['duration']) > 1:
        raise RuntimeError('La salida no cumple la resolución/duración solicitadas; conservar original para inspección')
    # Decode the entire deliverable, not just its header.
    subprocess.run(['ffmpeg', '-v', 'error', '-i', str(final), '-f', 'null', '-'], check=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(final), '-vf', 'fps=1,scale=480:-1',
                    str(OUT / 'review-%02d.jpg')], check=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-sseof', '-0.05', '-i', str(final), '-frames:v', '1', str(OUT / 'last-frame.png')], check=True)
    write('validation.json', {'decodable': True, 'codec': video['codec_name'], 'width': video['width'], 'height': video['height'],
                              'duration': duration, 'bytes': final.stat().st_size, 'sha256': digest(final),
                              'visual_review': 'PENDIENTE: identidad, órbita, impacto, escaneo y continuidad con el maestro',
                              'physical_mobile_test': False})
    write('status.json', {'state': 'EN VALIDACIÓN', 'video': 'intro.mp4', 'master': 'master.png',
                          'next_video_authorized': False, 'source': 'Seedance 2.5 / OpenRouter', 'job': safe_job(job)})


def prepare():
    catalog = json.loads(request(API + '/videos/models', authenticated=bool(os.environ.get('OPENROUTER_API_KEY'))))
    models = catalog.get('data', [])
    seedance = [m for m in models if 'seedance' in (m.get('id', '') + m.get('name', '')).lower()]
    write('seedance-catalog.json', {'data': seedance})
    selected = [m for m in seedance if re.search(r'(?<!\d)2[.\-]5(?!\d)', m.get('id', '') + ' ' + m.get('name', ''))]
    # Do not silently switch to a different model or invent a model slug.
    if not selected:
        raise RuntimeError('Seedance 2.5 no aparece en el catálogo de video de OpenRouter; no se ha enviado ningún trabajo de pago.')
    write('selected-model.json', selected[0])
    references = OUT / 'references'
    references.mkdir(exist_ok=True)
    sources = []
    for angle in range(0, 72, 9):
        name = f'Tan-Beige_TAM_{angle:02}.png'
        url = 'https://www.kia.com/content/dam/kwcms/gt/en/images/showroom/Tasman-TK-26my/Features/360vr/ext/tan-beige/' + name
        content = request(url)
        if not content.startswith(b'\x89PNG\r\n\x1a\n'):
            raise RuntimeError(f'La referencia oficial {name} no es PNG')
        (references / name).write_bytes(content)
        sources.append({'file': 'references/' + name, 'url': url, 'sha256': hashlib.sha256(content).hexdigest()})
    write('references.json', {'source': 'Kia Ecuador official Tan Beige TAM 360 viewer', 'usage': 'Production reference for this Kia showcase; original copyright remains Kia.', 'images': sources})
    write('status.json', {'state': 'REFERENCIAS PREPARADAS', 'paid_jobs_submitted': 0, 'next': 'Fijar maestro y extremos antes de solicitar la intro. Ningún otro video autorizado.'})


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    config = json.loads((OUT / 'production.json').read_text())
    if config['stage'] == 'references':
        prepare()
    elif config['stage'] == 'intro':
        generate(config)
    else:
        raise RuntimeError('Solo se autorizan referencias e introducción; ningún otro video')


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        write('status.json', {'state': 'ERROR', 'error': str(exc), 'next_video_authorized': False})
        print(str(exc), file=sys.stderr)
        sys.exit(1)
