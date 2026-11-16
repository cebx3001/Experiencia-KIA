"""Produce only X-TREK after the recorded intro approval. No browser-side key."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/tasman/video/xtrek'
spec = importlib.util.spec_from_file_location('intro_core', ROOT / 'tools/tasman-video/produce_intro.py')
core = importlib.util.module_from_spec(spec)
spec.loader.exec_module(core)
core.OUT = OUT


def write(name, value):
    core.write(name, value)


def payload(config):
    approvals = json.loads((ROOT / 'docs/tasman/video/approvals.json').read_text())
    master = ROOT / 'docs/tasman/video/intro/master.png'
    if approvals['intro']['state'] != 'APROBADA' or approvals['xtrek']['state'] != 'AUTORIZADA PARA PRODUCCIÓN':
        raise RuntimeError('X-TREK necesita la aprobación previa de la intro y la autorización del cliente')
    if core.digest(master) != config['master_sha256'] or config['master_sha256'] != approvals['intro']['master_sha256']:
        raise RuntimeError('El maestro aprobado no puede cambiar entre videos')
    if config['video'] != 'xtrek' or config['generate_audio'] is not False:
        raise RuntimeError('Este workflow solo produce X-TREK visual, sin audio generativo')
    model = json.loads((ROOT / 'docs/tasman/video/intro/selected-model.json').read_text())
    if model['id'] != config['model_id']:
        raise RuntimeError('No se cambia de modelo sin dirección explícita')
    for field, supported in [('duration', 'supported_durations'), ('resolution', 'supported_resolutions'), ('aspect_ratio', 'supported_aspect_ratios')]:
        if config[field] not in model[supported]:
            raise RuntimeError('Parámetro de video no admitido: ' + field)
    if not {'first_frame', 'last_frame'}.issubset(model['supported_frame_images']):
        raise RuntimeError('El modelo debe admitir ambos extremos')
    frames = []
    for frame_type in ['first_frame', 'last_frame']:
        item = core.media(master, 'image')
        item['frame_type'] = frame_type
        frames.append(item)
    references = [core.media(ROOT / f'docs/tasman/video/intro/references/Tan-Beige_TAM_{angle:02}.png', 'image') for angle in config['factory_angles']]
    for name in config.get('environment_images', ['environment.png']):
        references.append(core.media(OUT / 'references' / name, 'image'))
    for name in config.get('video_guides', ['approved-look.mp4', 'climb-motion.mp4']):
        references.append(core.media(OUT / 'references' / name, 'video', config['reference_commit']))
    return {'model': config['model_id'], 'duration': config['duration'], 'resolution': config['resolution'],
            'aspect_ratio': config['aspect_ratio'], 'seed': config['seed'], 'generate_audio': False,
            'frame_images': frames, 'input_references': references, 'prompt': (OUT / 'prompt.txt').read_text()}


def finish(config):
    raw, final = OUT / 'xtrek-source.mp4', OUT / 'xtrek.mp4'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(raw), '-an', '-c:v', 'libx264', '-crf', '18',
                    '-preset', 'medium', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(final)], check=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-i', str(final), '-f', 'null', '-'], check=True)
    info = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(final)]))
    video = next(s for s in info['streams'] if s['codec_type'] == 'video')
    duration = float(info['format']['duration'])
    if video['width'] != 1280 or video['height'] != 720 or abs(duration - config['duration']) > 1:
        raise RuntimeError('La salida no cumple la duración o resolución solicitadas')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(final), '-vf', 'fps=1,scale=480:-1', str(OUT / 'review-%02d.jpg')], check=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(final), '-frames:v', '1', str(OUT / 'first-frame.png')], check=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-sseof', '-0.05', '-i', str(final), '-frames:v', '1', str(OUT / 'last-frame.png')], check=True)
    write('validation.json', {'decodable': True, 'duration': duration, 'width': video['width'], 'height': video['height'],
                              'bytes': final.stat().st_size, 'sha256': core.digest(final), 'audio': False,
                              'physical_mobile_test': False, 'visual_review': 'PENDIENTE: orden de armado, apoyo de ambos ejes, cámara fija, desarmado y coincidencia con maestro'})
    write('status.json', {'state': 'EN VALIDACIÓN', 'video': 'xtrek.mp4', 'master': '../intro/master.png', 'next_video_authorized': False})


def main():
    OUT.mkdir(exist_ok=True)
    config = json.loads((OUT / 'production.json').read_text())
    if config.get('generation_enabled') is False:
        print('Paid X-TREK generation is paused. Reuse the existing render and finish sound/editing locally.')
        return
    final, validation = OUT / 'xtrek.mp4', OUT / 'validation.json'
    if final.exists() and validation.exists() and core.digest(final) == json.loads(validation.read_text())['sha256']:
        print('X-TREK ya entregado: se reutiliza sin nueva generación')
        return
    body = payload(config)
    if not os.environ.get('OPENROUTER_API_KEY'):
        raise RuntimeError('Actions no recibió el secreto OPEN_ROUTER_ACCESS')
    connection = json.loads(core.request(core.API + '/key', authenticated=True))
    if not isinstance(connection.get('data'), dict):
        raise RuntimeError('No se pudo verificar la autenticación de OpenRouter')
    write('connection.json', {'authenticated': True, 'secret_name': 'OPEN_ROUTER_ACCESS', 'endpoint': '/api/v1/key'})
    budget_spec = importlib.util.spec_from_file_location('budget_guard', ROOT / 'tools/tasman-budget/guard.py')
    budget = importlib.util.module_from_spec(budget_spec)
    budget_spec.loader.exec_module(budget)
    digest = hashlib.sha256(json.dumps(body, sort_keys=True).encode()).hexdigest()
    write('request-summary.json', {'request_sha256': digest, 'model': body['model'], 'duration': body['duration'],
                                  'resolution': body['resolution'], 'generate_audio': False, 'seed': body['seed'],
                                  'master_sha256': config['master_sha256'], 'first_and_last_frame': 'same approved intro/master.png',
                                  'style_sha256': core.digest(OUT / 'style-snapshot.txt'),
                                  'image_references': sum(r['type'] == 'image_url' for r in body['input_references']),
                                  'video_guides': sum(r['type'] == 'video_url' for r in body['input_references'])})
    receipt, intent = OUT / 'job.json', OUT / 'submission-intent.json'
    if receipt.exists():
        previous = json.loads(receipt.read_text())
        if previous['request_sha256'] != digest:
            raise RuntimeError('Existe otro trabajo: no se sustituye ni se paga automáticamente')
        job = json.loads(core.request(core.API + '/videos/' + previous['job']['id'], authenticated=True))
    else:
        if intent.exists():
            raise RuntimeError('Existe un envío ambiguo sin recibo: comprobarlo antes de reenviar')
        models = json.loads(core.request(core.API + '/videos/models', authenticated=True))['data']
        live_model = next(m for m in models if m['id'] == config['model_id'])
        write('budget-preflight.json', budget.preflight('xtrek', config['duration'], connection['data'], live_model))
        write('submission-intent.json', {'request_sha256': digest, 'automatic_resubmission': False})
        try:
            job = json.loads(core.request(core.API + '/videos', authenticated=True, payload=body))
        except core.RequestRejected as error:
            if error.status_code in [400, 401, 402, 403, 404, 405, 413, 415, 422]:
                write('rejected-request.json', {'request_sha256': digest, 'http_status': error.status_code, 'accepted': False})
                intent.unlink()
            raise
        if not re.fullmatch(r'[A-Za-z0-9_-]+', job.get('id', '')):
            raise RuntimeError('No hay un recibo válido; no se repite un envío ambiguo')
    write('job.json', {'request_sha256': digest, 'job': core.safe_job(job)})
    deadline = time.monotonic() + 30 * 60
    while job.get('status') != 'completed':
        if job.get('status') in ['failed', 'cancelled', 'expired']:
            raise RuntimeError('El proveedor terminó el trabajo: ' + json.dumps(core.safe_job(job)))
        if time.monotonic() > deadline:
            raise RuntimeError('Trabajo pendiente; una nueva ejecución reanuda el mismo recibo sin volver a pagarlo')
        print('X-TREK:', job.get('status'), flush=True)
        time.sleep(15)
        job = json.loads(core.request(core.API + '/videos/' + job['id'], authenticated=True))
        write('job.json', {'request_sha256': digest, 'job': core.safe_job(job)})
    (OUT / 'xtrek-source.mp4').write_bytes(core.request(core.API + '/videos/' + job['id'] + '/content', authenticated=True))
    finish(config)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        write('status.json', {'state': 'ERROR', 'error': str(error), 'next_video_authorized': False})
        print(str(error), file=sys.stderr)
        sys.exit(1)
