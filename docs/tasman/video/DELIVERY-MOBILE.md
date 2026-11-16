# Entrega móvil · revisión 20261116-r5

Aplicación fuente: `experiencia-video/`; publicación: `/experiencia/`. Se conservan las fuentes de PlayCanvas y los renders anteriores.

- Visor reducido a **«Desliza para girar»**, arrastre bidireccional con inercia y zoom por pellizco. Se eliminaron del DOM las poses, accesos a detalles, Anterior/Siguiente, Vista completa, zoom y contador. Se conserva el acceso textual a las seis experiencias.
- X-TREK **sin cambios**, por instrucción posterior del cliente. El hash de su MP4 publicado coincide exactamente con r4. Intro, Storm, Carga e Interior también conservan sus videos.
- Vadeo corregido una sola vez: rodaje nativo vertical, sin dispositivo sobre el techo, cruce del río y salida a la orilla; la cámara regresa visiblemente mientras el entorno se desarma hasta alcanzar el mismo maestro. No se superpone un vehículo grande sobre el plano lejano anterior. Original rechazado, recibos y recolor r4 archivados en `vadeo/attempts/01-wide-shot-roof-artifact/`.
- Remolque: reparación local seguida cuadro a cuadro del pequeño objeto sobre la cabina, mediante una placa de fondo reconstruida solo en esa zona. Se conservan acción, montaje, remolque y audio original; flujo de AAC verificado idéntico. No se solicitó otra generación.
- Android/Chrome: primer toque sobre el video inicia sonido y caída después de la activación que exige el navegador para vibrar. Sin pantalla de acceso ni botón Entrar. Contacto a 1,5 s con una sola solicitud `[90,35,40]`; pausa, salto y ocultación cancelan. La API no puede forzar los ajustes de vibración del dispositivo.
- iPhone: respaldo experimental de WebHaptics 0.0.6, MIT, mediante interruptor nativo de Safari. Sin controles visibles ni sonidos de depuración. Flujo de solicitud y cancelación probado por contrato; **respuesta física del Taptic Engine pendiente de comprobar en un iPhone real**. Investigación y límites en `corrections/HAPTICS-R5.md`.
- Siete videos 720×1280, 20 s, audio AAC 48 kHz. Tipografía oficial Kia Signature, controles textuales, un solo reproductor, carga de experiencias bajo demanda y caché r5. Sin GLB ni WebGL.
- Se conserva el enlace del escaneo al visor en el mismo cuadro, la órbita de 72 imágenes de la intro, máximo 14 imágenes decodificadas, menú interactivo y cierre al WhatsApp público de Kia Ecuador. La función de la escena mojada se denomina ESC, conforme a la ficha oficial.

## Presupuesto

Recibos deduplicados: **38,48148 USD de 45 USD**. Esta revisión añadió únicamente **2,78307 USD** por la corrección de Vadeo, con una sola solicitud y sin reintentos. Saldo teórico restante: **6,51852 USD**. Remolque, interfaz, gestos y vibración no añadieron costes de generación.

## Validación y reproducción

Pruebas de Chrome en 390×844, 360×740 y 1280×800; gestos táctiles reales enviados por CDP, activación antes del impacto, cancelación, menú y seis clips. Contrato separado del respaldo iOS, sin simular una confirmación de hardware físico. Verificación adicional de formatos, hashes públicos y QR.

Herramientas locales en `tools/tasman-preview/`: `remove_roof_artifact.py`, `export_mobile.py`, `build_web.py`; se conservan las herramientas de intro, sonido y extracción del visor. La reparación usa un original fijo en `trailer/cleanup-base/`, nunca una reparación anterior. No se dispone de teléfonos físicos en este entorno. Las películas son ilustraciones publicitarias, no simulaciones certificadas de la física ni de ESC.
