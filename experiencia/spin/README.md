# Visor por gestos

72 imágenes extraídas de la órbita de la intro aprobada, mismo vehículo e iluminación, WebP 960×540. Ancla 45 enlazada al último fotograma codificado de intro en el mismo encuadre. Sin modelo 3D ni nuevas generaciones.

Interfaz: únicamente «Desliza para girar». Arrastre bidireccional fraccional, mezcla de imágenes e inercia. Pellizco para zoom y arrastre para desplazar la imagen ampliada. Sin poses, detalles, Anterior/Siguiente, Vista completa, botones de zoom ni contador. Flechas de teclado como alternativa accesible; el retorno al maestro antes de abrir una experiencia es interno, sin control añadido.

Máximo 14 imágenes decodificadas, descarte con ImageBitmap.close, precarga codificada de baja prioridad durante el escaneo y exclusión para ahorro de datos o 2G. Referencias oficiales anteriores conservadas en `frames/` como archivo; el visor usa `scan-frames/`. Pruebas en `docs/tasman/evidence/mobile-browser-review.json`, sin certificar hardware físico.
