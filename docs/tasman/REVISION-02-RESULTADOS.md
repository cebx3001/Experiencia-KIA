# Revisión 02 · Implementación y límites de comprobación

Base: `a2f4fd9`, sobre la primera pasada existente. Se conservan el QR, una sola instancia PlayCanvas, los materiales, sus cuatro variantes, el estudio, navegación y los cinco accesos.

## Costes tratados

La entrega móvil deriva del mismo GLB con Meshoptimizer, error normalizado máximo solicitado 0,0003 y bordes bloqueados. Pasa de 3.741.245 a 832.267 triángulos y de 35.712.304 a 15.322.580 bytes. Las 1.458 entidades, nombres, pivotes, variantes y bytes de imágenes se mantienen; `lod-integrity.json` lo comprueba. El interior sigue en el mismo presupuesto: no se descarga otro GLB al entrar, ni se duplican texturas. El original y los perfiles de escritorio permanecen disponibles.

Móvil: MSAA inicial 2×, con descenso a 1× bajo presión; SSAO y reflexión planar desactivados, culling primario activado con los bounds regenerados del GLB. La iluminación LTC, el entorno especular, clearcoat y mapas de pintura/cristal conservan su respuesta dinámica. Permanecen color/profundidad de escena porque el cristal los utiliza. Las sombras móviles usan PCF y las actualizaciones de movimiento se limitan a unos 8–10 Hz; se detienen al terminar. La reflexión del suelo es un coste separado de los reflejos de carrocería.

`studio/tools/build-cinematic-lod.mjs` reproduce el recurso. La auditoría incluye parámetros y recuentos. El shader de agua no reenvía vértices; el terreno se genera una vez. Las llamadas DOM se reutilizan. Los recursos propios de cada misión se destruyen al salir; el pool acotado del impacto se reutiliza y prepara durante la carga.

## Reloj y acabado

La suspensión se simula a 240 Hz una sola vez al preparar la toma y se muestrea por tiempo de reproducción; no hay acumulación de pasos físicos en el bucle. El reloj usa tiempo real, excluye tiempo oculto y permite 0,25× para revisión (`?slow=1`). El marcador de contacto se dispara una vez incluso si se saltan muestras a 3 FPS. El motor puede limitar su delta sin prolongar la secuencia. La prueba del controlador usa la cámara real de PlayCanvas en cuatro relaciones de aspecto y 3 FPS.

Impacto: pool de 28 partículas de alpha irregular generada, ocho piedras en arco corto, sin círculo expansivo. Escaneo: banda y estela de puntos en el shader emisivo de los materiales originales, con profundidad y oclusión del vehículo; no se añade una malla rectangular. Agua: volumen que sube hasta 0,8 m, normales onduladas en shader y reflejos especulares del estudio. Carga: conserva los seis bloques escalonados dentro del balde. Remolque: geometría de un utilitario de eje único con acople, lanza en A, chasis, laterales, guardabarros y perfiles de neumáticos. X-TREK: avance de 1,6 m en seis segundos sobre rampa de piedra estática con textura procedural; cuatro apoyos independientes, inclinación de chasis y giro de ruedas. Interior: luz de relleno acotada al tablero y gráficos en sus coordenadas existentes.

## Recursos y licencias

Todos los nuevos meshes de remolque, roca, normal de agua y alpha de polvo son procedurales propios, reproducibles en `studio/campaign-effects.js` y `campaign-scene.js`; se ofrecen bajo CC0. No se descargaron assets VFX ni de terceros. Referencia tipológica del remolque: utilitario ligero de eje único y lanza en A, gama Humbaur HA, https://www.humbaur.com/en/trailers/single-axle-trailers/ha/ . La página del fabricante devuelve 403 en este entorno: no se afirma haber verificado sus medidas ni copiar un modelo comercial. Las dimensiones nominales usadas (balde 2,45 × 1,55 m) son parámetros del diseño procedural. Como alternativa accesible se inspeccionaron la fotografía y el catálogo de remolques reales de Trailer Joe’s/Hughes, commit `95842e56e4b4fef0af704f99a8c464f38068bcfe`: https://github.com/johnharveyusa/trailerjoes/blob/95842e56e4b4fef0af704f99a8c464f38068bcfe/63458004.avif y `trailer-homepage.html` (6’4” × 10, rueda de 15”, acople de 2”). Se contrastaron lanza en A, acople, eje bajo la zona posterior del balde, guardabarros y pasamanos. No se redistribuye la fotografía ni su código; no consta licencia de reutilización de sus imágenes. La malla propia usa dimensiones nominales distintas y no pretende homologar capacidad de remolque. La simplificación usa Meshoptimizer (MIT), glTF Transform (MIT) y Draco (Apache-2.0); el recurso derivado conserva la procedencia y restricciones del modelo Kia original.

## Diagnóstico en el dispositivo

La URL de revisión admite `?perf=1`: el botón «Guardar diagnóstico» descarga JSON con navegador, memoria/núcleos declarados, resolución interna, perfil, intervalos p50/p95, pausas largas, draw calls, triángulos, tiempos CPU de update y envío de render. GPU queda `null` cuando no hay temporizador válido: el tiempo CPU no se presenta como tiempo GPU. Las muestras se etiquetan por escena/misión y se conservan hasta 1.800; se pueden comparar al inicio y tras uso prolongado. La API `__tasmanMaster.diagnostics.ab` permite aislar SSAO, MSAA, planar, culling y sombras. El diagnóstico de Carlos todavía requiere ejecutar esa URL en su teléfono.

Los clips se generan con `diagnostics/capture-revision02.cjs` a 12 muestras por segundo desde el WebGL real, con reloj controlado; son demostraciones de movimiento, no mediciones de FPS del teléfono. `ffmpeg -i impact.mp4 -vf setpts=4*PTS impact-slow.mp4` reproduce la cámara lenta. Las pruebas de este entorno son Chromium con SwiftShader y viewport táctil: no son validación de Android físico ni Safari/iPhone. El objetivo de 30 FPS sostenidos en el teléfono de Carlos no se considera demostrado sin ese hardware.

## Mediciones disponibles

Una carga nueva de navegador por versión en el mismo entorno registró 89.055 ms antes y 26.400 ms después hasta `ready`. La compilación de shaders por SwiftShader y las diferencias de carga de CPU influyen mucho: esto no predice tiempos de un teléfono. La descarga de GLB baja un 57,1%; la geometría, un 77,8%.

El intento de cadencia continua anterior no completó las 12 muestras requeridas dentro del tiempo acotado; se registra `incomplete`. En la órbita de la revisión, a 390×492 píxeles internos, se obtuvieron p50 5.984,6 ms y p95 6.603,9 ms, 120 draw calls, con CPU de envío de unos 2,1 ms y GPU sin temporizador disponible. Son intervalos del renderizador por software, no rendimiento móvil. El resto del benchmark quedó incompleto al limitar su duración; no se infieren métricas de agua/X-TREK ni una mejora porcentual de FPS. Los primeros intentos de render solicitado manualmente se descartaron porque no representaban cadencia continua. Los JSON válidos indican el protocolo y los límites.

La comprobación funcional y de los 21 hashes publicados pasó en GitHub Actions: https://github.com/cebx3001/Experiencia-KIA/actions/runs/43537954535 . También pasó la regresión del visor original: https://github.com/cebx3001/Experiencia-KIA/actions/runs/43537954534 . Esas pruebas cubren flujo, shaders y assets, y no certifican 30 FPS en Android.

Los clips de demostración usan escala de render 0,65 para mantener acotado el coste de captura por software; las imágenes `*-final.png` se capturan de nuevo a resolución nativa. Esto solo pertenece al generador offline y no modifica la resolución de la web publicada.
