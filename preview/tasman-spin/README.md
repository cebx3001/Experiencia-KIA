# Explorador móvil por imágenes

72 vistas extraídas de la órbita de la intro aprobada; el mismo vehículo, color e iluminación. WebP 960×540. La aplicación usa `scan-frames/`; `frames/` conserva las referencias oficiales anteriores como archivo, sin sustituir el vehículo al explorar. `scan-frames.json` registra tiempos y hashes. No requiere generación de pago ni modelo 3D.

El constructor web reemplaza el ancla 45 con el último fotograma codificado de intro y usa el mismo cuadro vertical como póster. El escaneo y el visor comparten dimensiones de escena; no cambian el encuadre durante el enlace.

Arrastre bidireccional fraccional con mezcla de vistas e inercia, pellizco móvil, desplazamiento ampliado, teclado y acercamientos animados a faros, ruedas y paila. Máximo 14 ImageBitmap decodificados; se cierran los expulsados. Precarga codificada de baja prioridad durante el escaneo, excluida en ahorro de datos y conexiones 2G. Recursos con versión de publicación para evitar imágenes antiguas.

La fuente es un video generado: las vistas intermedias no equivalen a geometría 3D certificada. La prueba de navegador se conserva en `docs/tasman/evidence/mobile-browser-review.json`; emulación móvil/escritorio, sin certificar hardware físico.
