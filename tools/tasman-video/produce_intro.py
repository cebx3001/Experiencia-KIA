"""Server-side production. Credentials never enter requests saved to disk or web files."""
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/tasman/video/intro'
API = 'https://openrouter.ai/api/v1'


def write(name, value):
    (OUT / name).write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n')


def request(url, *, authenticated=False):
    headers = {'User-Agent': 'Experiencia-KIA-intro-production/1.0'}
    if authenticated:
        headers['Authorization'] = 'Bearer ' + os.environ['OPENROUTER_API_KEY']
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=120) as res:
            return res.read()
    except urllib.error.HTTPError as exc:
        # Avoid publishing signed URLs, credentials, or arbitrary provider error bodies.
        raise RuntimeError(f'HTTP {exc.code}: {urllib.parse.urlsplit(url).hostname}') from None


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
    else:
        if not os.environ.get('OPENROUTER_API_KEY'):
            raise RuntimeError('Falta el secreto OPENROUTER_API_KEY en GitHub Actions')
        raise RuntimeError('Etapa todavía no implementada; no se envía un trabajo sin extremos fijados')


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        write('status.json', {'state': 'ERROR', 'error': str(exc), 'next_video_authorized': False})
        print(str(exc), file=sys.stderr)
        sys.exit(1)
