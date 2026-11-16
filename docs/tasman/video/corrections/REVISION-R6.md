# Cambios solicitados · r6

- Splash de aproximadamente 3 segundos con logo oficial, **Kia Ecuador** y «Explora lo que te mueve». Precarga del mismo video de intro. Sin progreso ficticio ni botón de entrada.
- La intro empieza automáticamente después del splash. Si el navegador impide audio automático, reproduce silenciada y ofrece activar sonido/vibración con un toque opcional; ese toque ya no condiciona el inicio. La instrucción posterior del cliente sustituye la espera implementada en r5.
- Tipografía: verificados los glifos reales de los botones mediante `CSS.getPlatformFontsForNode`, no solo CSS. Chrome utiliza `Kia Signature Fix Regular`, nombre interno de la fuente oficial Kia Signature Regular. Se conservaron los archivos oficiales y sus subconjuntos; familia y peso 400 explícitos en controles, sin síntesis de fuente.
- Botones de navegación en cápsulas, iconos cian y numeración, siguiendo la jerarquía/iconografía de `docs/tasman/references/tasman-05-08.jpg`. La forma redondeada sigue la petición posterior del cliente. Sin botones de poses, giro, detalles o zoom en el visor.
- Visor: eliminada la superposición alfa entre imágenes. La cámara conserva inercia, pero dibuja un único fotograma real y termina en un índice entero. Pellizco para ampliar.
- Intro: retirada únicamente la placa de sombra/reflejos ya dibujada en el suelo antes de la llegada. Píxeles del vehículo protegidos con su matte y la trayectoria original; cero cambios de movimiento, gravedad, rebote, polvo, escaneo o tiempos. La sombra de contacto aparece al acercarse al suelo (1,3–1,5 s). Los cuadros desde el contacto se conservaron antes de la recodificación; SSIM de video recodificado respecto a r5 desde 1,5 s: 0,998423. El póster utiliza la misma placa limpia.
- Audio: silbido descendente original entre 0,27 y 1,49 s, aire creciente y golpe material pesado a 1,5 s, con contenido medio audible en teléfono. Mezcla local limitada a los primeros 2,8 s; PCM del escaneo posterior sin cambios antes de AAC. Sin música, muestras de librería ni API de audio.
- Los otros seis videos, incluido X-TREK, se mantienen byte por byte.

Total de generaciones: **38,48148 USD de 45 USD**. Esta revisión no envía ninguna generación de pago. Se conservan la investigación y el respaldo experimental iOS; no se certifican vibradores ni altavoces físicos desde la emulación.
