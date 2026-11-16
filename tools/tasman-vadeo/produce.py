"""Generate and package an authorized demonstration using its production manifest."""
import base64
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import time

ROOT = Path(__file__).resolve().parents[2]
VIDEO = ROOT / 'docs/tasman/video'
SCENE = sys.argv[1] if __name__ == '__main__' and len(sys.argv) > 1 else 'vadeo'
if SCENE not in ('vadeo', 'storm', 'trailer', 'cargo'):
    raise ValueError('Escena no configurada')
OUT = VIDEO / SCENE
MASTER = VIDEO / 'intro/master.png'


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


core = load_module('intro_core', ROOT / 'tools/tasman-video/produce_intro.py')
budget = load_module('budget_guard', ROOT / 'tools/tasman-budget/guard.py')
core.OUT = OUT


def get(name):
    return json.loads((OUT / name).read_text())


def ready(config):
    approvals = json.loads((VIDEO / 'approvals.json').read_text())
    if approvals[SCENE]['state'] != 'AUTORIZADA PARA PRODUCCIÓN':
        raise RuntimeError(f'{SCENE} requiere autorización de producción')
    if core.digest(MASTER) != config['master_sha256'] or config['master_sha256'] != approvals['intro']['master_sha256']:
        raise RuntimeError('El fotograma maestro cambió')


def image_ref(path):
    if path.suffix == '.png':
        return core.media(path, 'image')
    data = base64.b64encode(path.read_bytes()).decode()
    return {'type': 'image_url', 'image_url': {'url': 'data:image/jpeg;base64,' + data}}


def payload(config):
    if config.get('identity_mode') == 'approved_master_only':
        # No alternative truck in an environment storyboard may override the approved car.
        body = {k: config[k] for k in ('duration', 'resolution', 'aspect_ratio', 'seed', 'generate_audio')}
        body['model'] = config['model_id']
        body['frame_images'] = []
        for frame_type in ('first_frame', 'last_frame'):
            frame = image_ref(MASTER)
            frame['frame_type'] = frame_type
            body['frame_images'].append(frame)
        angles = config.get('official_identity_angles', [])
        if angles:
            if SCENE != 'cargo' or angles != [27, 18, 36]:
                raise RuntimeError('Only the reviewed original Kia rear/bed views are authorized for Cargo')
            factory = VIDEO / 'intro/references'
            body['input_references'] = [image_ref(factory / f'Tan-Beige_TAM_{a:02}.png') for a in angles]
        body['prompt'] = (OUT / 'prompt.txt').read_text()
        return body
    factory = VIDEO / 'intro/references'
    refs = [MASTER, *(factory / f'Tan-Beige_TAM_{a:02}.png' for a in (36, 45, 54)),
            *(OUT / 'references' / f'{n}.jpg' for n in config.get('references', ('wireframe', 'entry', 'crossing', 'exit')))]
    body = {k: config[k] for k in ('duration', 'resolution', 'aspect_ratio', 'seed', 'generate_audio')}
    body['model'] = config['model_id']
    body['input_references'] = [image_ref(p) for p in refs]
    body['prompt'] = (OUT / 'prompt.txt').read_text()
    return body


def check_raw_endpoints(source):
    scores = {}
    with tempfile.TemporaryDirectory() as directory:
        for name, seek in [('first', []), ('last', ['-sseof', '-0.5'])]:
            frame = Path(directory) / (name + '.png')
            filters = ['-vf', 'reverse'] if name == 'last' else []
            subprocess.run(['ffmpeg', '-v', 'error', '-y', *seek, '-i', str(source), *filters, '-frames:v', '1', str(frame)], check=True)
            graph = '[0:v]scale=1280:720,crop=1152:560:64:100,format=yuv420p[a];[1:v]scale=1280:720,crop=1152:560:64:100,format=yuv420p[b];[a][b]ssim'
            result = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(frame), '-i', str(MASTER),
                                     '-filter_complex', graph, '-frames:v', '1', '-f', 'null', '-'], capture_output=True, text=True, check=True)
            match = re.search(r'All:([0-9.]+)', result.stderr)
            scores[name] = float(match.group(1)) if match else 0
    if min(scores.values()) < .94:
        raise RuntimeError('Raw framing does not match the approved master; a master overlay must not hide it: ' + json.dumps(scores))
    return scores


def process(config, source):
    output = OUT / f'{SCENE}.mp4'
    if config.get('identity_mode') == 'approved_master_only':
        scores = check_raw_endpoints(source)
        delivery_duration = config.get('editorial_delivery_seconds', config['duration'])
        rate = config['duration'] / delivery_duration
        vf = f'setpts=(PTS-STARTPTS)/{rate},minterpolate=fps=24:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1,tpad=stop_mode=clone:stop_duration=0.25'
        af = f'atempo={rate},loudnorm=I=-18:TP=-1.5:LRA=11'
        # Preserve the generated continuity. Never dissolve a correct photo over a different car.
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(source), '-map', '0:v:0', '-map', '0:a?',
                        '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p',
                        '-vf', vf, '-af', af, '-t', str(delivery_duration), '-c:a', 'aac', '-ar', '48000', '-b:a', '192k',
                        '-movflags', '+faststart', str(output)], check=True)
        info = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(output)]))
        has_audio = any(s['codec_type'] == 'audio' for s in info['streams'])
        if config.get('generate_audio') and not has_audio:
            raise RuntimeError('Requested audio is missing; track presence is a minimum, not an audio-quality approval')
        core.write('validation.json', {'decodable': True, 'duration_seconds': float(info['format']['duration']),
                   'audio': has_audio, 'sha256': core.digest(output), 'raw_endpoint_similarity': scores,
                   'visual_and_audio_review': 'REQUIRED: identity throughout, screenplay-specific action, synchronized effects; not an automatic creative approval'})
        core.write('status.json', {'state': 'EN VALIDACIÓN; NO APROBADA AUTOMÁTICAMENTE', 'video': output.name, 'next_video_authorized': False})
        return
    close = config['duration'] - 0.5
    graph = (
        '[1:v]scale=1280:720,format=rgba,split=2[s][e];'
        '[s]trim=duration=0.5,setpts=PTS-STARTPTS,fade=t=out:st=0.08:d=0.34:alpha=1[start];'
        f'[e]trim=duration=0.5,setpts=PTS-STARTPTS,fade=t=in:st=0:d=0.34:alpha=1,setpts=PTS+{close}/TB[end];'
        '[0:v][start]overlay=eof_action=pass[first];[first][end]overlay=eof_action=pass[v]'
    )
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(source), '-loop', '1', '-framerate', '24',
                    '-i', str(MASTER), '-filter_complex', graph, '-map', '[v]', '-map', '0:a?',
                    '-t', str(config['duration']), '-c:v', 'libx264', '-preset', 'fast', '-crf', '18',
                    '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', str(output)], check=True)
    info = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-show_format',
                                               '-of', 'json', str(output)]))
    video = next(s for s in info['streams'] if s['codec_type'] == 'video')
    duration = float(info['format']['duration'])
    if abs(duration - config['duration']) > 0.1 or (video['width'], video['height']) != (1280, 720):
        raise RuntimeError('El MP4 no cumple la duración o resolución prevista')
    subprocess.run(['ffmpeg', '-v', 'error', '-i', str(output), '-f', 'null', '-'], check=True)
    core.write('validation.json', {'decodable': True, 'duration_seconds': duration, 'width': video['width'],
                                  'height': video['height'], 'audio': any(s['codec_type'] == 'audio' for s in info['streams']),
                                  'sha256': core.digest(output), 'master_sha256': core.digest(MASTER)})
    core.write('status.json', {'state': 'EN VALIDACIÓN', 'video': output.name, 'next_video_authorized': False})


def run():
    config = get('production.json')
    if config.get('generation_enabled') is False:
        raise RuntimeError('Generation is disabled; no new paid request is authorized')
    ready(config)
    if (OUT / f'{SCENE}.mp4').exists() and (OUT / 'validation.json').exists():
        if core.digest(OUT / f'{SCENE}.mp4') == get('validation.json')['sha256']:
            return
    if not os.environ.get('OPENROUTER_API_KEY'):
        raise RuntimeError('Actions no recibió el secreto OPEN_ROUTER_ACCESS')
    body = payload(config)
    request_hash = hashlib.sha256(json.dumps(body, sort_keys=True).encode()).hexdigest()
    intent = OUT / 'submission-intent.json'
    receipt = OUT / 'job.json'
    if receipt.exists():
        saved = get('job.json')
        if saved['request_sha256'] != request_hash:
            raise RuntimeError('Existe un trabajo aceptado con otros parámetros')
        status_url = core.API + '/videos/' + saved['job']['id']
        job = json.loads(core.request(status_url, authenticated=True))
    else:
        if intent.exists():
            raise RuntimeError('Existe un envío pendiente de reconciliar')
        if config.get('identity_mode') != 'approved_master_only':
            raise RuntimeError('No new paid request without explicit master frame anchors and an identity-consistent reference set')
        key = json.loads(core.request(core.API + '/key', authenticated=True))['data']
        catalog = json.loads(core.request(core.API + '/videos/models', authenticated=True))['data']
        model = next(m for m in catalog if m['id'] == body['model'])
        for field in ('duration', 'resolution', 'aspect_ratio'):
            if config[field] not in model[f'supported_{field}s']:
                raise RuntimeError('Parámetro no disponible: ' + field)
        core.write('budget-preflight.json', budget.preflight(SCENE, config['duration'], key, model))
        core.write('submission-intent.json', {'request_sha256': request_hash})
        try:
            job = json.loads(core.request(core.API + '/videos', authenticated=True, payload=body))
        except core.RequestRejected as error:
            if error.status_code in (400, 401, 402, 403, 404, 405, 413, 415, 422):
                core.write('rejected-request.json', {'http_status': error.status_code, 'accepted': False})
                intent.unlink()
            raise
        if not re.fullmatch(r'[A-Za-z0-9_-]+', job.get('id', '')):
            raise RuntimeError('La generación no devolvió un identificador verificable')
        status_url = core.API + '/videos/' + job['id']
    deadline = time.monotonic() + 30 * 60
    while True:
        core.write('job.json', {'request_sha256': request_hash, 'job': core.safe_job(job)})
        if job.get('status') == 'completed':
            break
        if job.get('status') in ('failed', 'cancelled', 'expired'):
            raise RuntimeError('OpenRouter terminó el trabajo: ' + json.dumps(core.safe_job(job)))
        if time.monotonic() >= deadline:
            raise RuntimeError('Trabajo pendiente. Se puede continuar con el recibo guardado.')
        time.sleep(15)
        job = json.loads(core.request(status_url, authenticated=True))
    raw = OUT / f'{SCENE}-source.mp4'
    raw.write_bytes(core.request(status_url + '/content', authenticated=True))
    process(config, raw)


if __name__ == '__main__':
    try:
        run()
    except Exception as exc:
        core.write('status.json', {'state': 'ERROR', 'error': core.safe_api_error(json.dumps({'error': str(exc)}))})
        raise SystemExit(str(exc)) from None
