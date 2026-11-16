# Entrega móvil y publicación

La instrucción posterior del cliente autoriza terminar la integración y publicación sin revisiones intermedias. Se conserva el material existente y no se realizan correcciones de pago automáticas.

- Aplicación fuente: `experiencia-video/`; publicación: `/experiencia/`, manteniendo las fuentes anteriores de PlayCanvas en el repositorio.
- Siete videos 720×1280, 20 s; audio AAC. Interior es nativo 9:16; los anteriores conservan el encuadre horizontal completo dentro de un lienzo vertical negro. No se inventó contenido fuera del encuadre ni se recortó la camioneta/remolque. El plano se abre dentro de la acción ya generada.
- Maestro vertical derivado sin generación, reproducible en `shared/vertical-master.json`.
- Intro y X-TREK incorporan efectos originales de síntesis local reproducible: `tools/tasman-preview/sound_design.py`. Contacto de intro fijado en 14/24 s del montaje final; sonido y vibración usan esa misma marca. Sonido pensado para medios audibles, no solo subgraves. La calidad de mezcla en parlante físico sigue pendiente.
- Inicio con gesto para sonido; pausa, salto y ocultación cancelan vibración. Un pulso por reproducción cuando el reloj del video cruza el contacto; no temporizador independiente. Safari/iPhone usa imagen, sonido y pequeña sacudida sin depender de vibración.
- Solo maestro y recursos de interfaz antes del gesto. Intro al entrar, pruebas bajo demanda. Una sola etiqueta video, liberada al salir. Sin GLB, motor WebGL ni iframe de PlayCanvas.
- Explorador con 72 vistas originales, zoom y detalles, caché decodificado máximo 14. Las vistas oficiales conservan identidad/geométría real pero su iluminación no es idéntica a la del maestro generado.
- Menú de seis pruebas, repetición, siguiente, regreso, cierre y conteo por id una vez tras terminar el clip. Cierre a WhatsApp oficial público `593999157077`, encontrado en páginas de Kia Ecuador y registrado en `interior/references/official-contact-links.json`; no se envía ningún mensaje automáticamente.
- Se usa el logo oficial del repositorio. Kia Signature no está disponible: tipografía de sistema como sustitución declarada.

## Límites visuales conservados para revisión

No todos los renders cumplen completamente el guion. X-TREK aún muestra un obstáculo dominante y no el camino continuo solicitado; el cambio queda identificado, sin disfrazarlo como corregido por un nuevo montaje. Storm conserva luz encapotada diurna y no alcanza un lateral puro; no se aplica una gradación que degrade la pintura para ocultar esa falta. Carga abre la compuerta pese al prompt que la pedía cerrada, y la pila/transferencia de peso requieren revisión. Interior usa fotos reales, pero pantallas y colocación de teléfonos no se certifican como reproducción exacta de fábrica. Estas propuestas se publican para revisar el recorrido completo; no quedan automáticamente aprobadas.

## Presupuesto

Recibos deduplicados: **27,34920 USD** del máximo de 45 USD. Esta continuación añadió Carga (2,32083 USD) e Interior (2,78307 USD). Remolque existente, imágenes del visor, sonido local, montaje y web no añadieron generaciones de pago.

## Reproducción

`python3 tools/tasman-preview/sound_design.py`, después `python3 tools/tasman-preview/export_mobile.py intro xtrek vadeo storm cargo trailer interior`. Los archivos fuente y recibos permanecen separados de las exportaciones móviles. Las pruebas de navegador y verificación de los archivos públicos acompañan la entrega. No se dispone de Android o iPhone físico en este entorno.
