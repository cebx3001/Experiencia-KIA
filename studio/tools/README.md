# Comprobar y mantener el estudio

La configuración actual usa el HDR 4K original del handoff, sin volver a hornearlo. Las fuentes adicionales de `accents` son LTC analíticas y no están en ese HDR; hornearlas también duplicaría su aporte especular.

Desde la raíz del repositorio, con Playwright 1.56.1 instalado fuera del checkout y Chromium disponible:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
# En otro terminal:
NODE_PATH=/ruta/node_modules node studio/tools/verify-studio.cjs /tmp/tasman-360
python3 studio/tools/contact-sheet.py /tmp/tasman-360 /tmp/tasman-360.jpg
```

`CHROMIUM_PATH` y `STUDIO_URL` permiten seleccionar navegador y servidor. La prueba usa SwiftShader; guarda capturas sin retoque después de ocho fotogramas completos de TAA, comprueba la orientación real de las fuentes, el vehículo estático, puertas, cámaras, entornos y parámetros ópticos. Incluye doce ángulos de órbita y cuatro elevados, además de la vista inicial a 1920×1200. Puede tardar bastante en software. Debe revisarse cada perspectiva: un informe sin errores no mide calidad fotográfica ni sustituye la comprobación de rendimiento en GPU real.

## Atlas original precalculado

`assets/studio-env-atlas-rgbp.bin` guarda los bytes RGBP nativos del prefiltrado `EnvLighting.generateLightingSource` a 1024 y `generateAtlas` a 1024 del motor fijado 2.23.1. Fuente, dimensiones y SHA-256 están en `studio-env-atlas.json`. La lectura y recarga GPU se compararon byte a byte; no se convierte el atlas a PNG/JPEG, no se cambia gamma ni resolución.

Si se modifica el HDR o el motor, eliminar `environment_cache` de la configuración para volver al prefiltrado completo en ejecución. No reutilizar el atlas anterior con un HDR distinto. Tras cargar el nuevo entorno puede recuperarse el contenido nativo mediante `await __tasmanMaster.app.scene.envAtlas.read(0,0,1024,1024)`, exportar los bytes sin conversión y regenerar los metadatos y hashes antes de habilitar de nuevo el caché. El entorno alternativo fotográfico siempre usa el prefiltrado completo.

## Reconstrucción opcional del entorno base

No hace falta Blender para ejecutar el visor. Si se desea experimentar con la captura del estudio vacío, Blender 4.3+ y Python con NumPy:

```sh
blender -b --python studio/tools/bake_studio_probe.py -- --config studio/assets/studio-lighting.json --output /tmp/tasman-new.hdr --threads 4 --samples 64 --width 4096
```

Este programa captura sólo `panels`, suelo y paredes, sin vehículo ni `accents`. No usa denoising y funciona sin OIDN. Guarda sus parámetros en un JSON contiguo. La imagen resultante no se considera idéntica al HDR heredado. Para adoptarla hay que recalcular los SH con `derive_indirect_sh.py --directory <directorio-de-recursos>`, actualizar `ambientSH`, invalidar el atlas anterior y revisar de nuevo toda la órbita.
