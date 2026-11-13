# Fase 1 — EN VALIDACIÓN

Rama de partida: `feat/tasman-unreal-studio`, commit `eba789ba2c8bc2063b998d2df5b14569842f2930`.

Vista publicada independiente: `studio/drop-preview.html`. La rama de integración añade también `studio/?phase=drop`. Reutiliza escena, vehículo, materiales y calidad adaptativa existentes. El estudio normal y su integración en la página principal conservan sus controles.

Movimiento: caída vertical de 1,15 m con gravedad de 9,81 m/s², contacto de cuatro ruedas y respuesta de suspensión con resorte/amortiguador. Integración fija a 240 Hz; coeficientes de dirección artística, no simulación de ingeniería. El modo lento usa 0,25 de velocidad. El clip exportado usa 0,5 de velocidad para revisión. No se añaden polvo, piedra, sacudida de cámara, vibración, escaneo, hologramas ni WhatsApp.

Auditoría del GLB móvil en ejecución: arriba +Y, frente +Z; centros de ruedas delanteras z=1,635 m y traseras z=-1,635 m, x=±0,81142 m, y=0,40497 m. Distancia entre ejes 3,27 m. Cada conjunto importado incluye tres componentes de representación (rueda y frenos); se desplaza el conjunto completo en coordenadas mundiales para respetar los pivotes rotados del importador. Durante la compresión las ruedas mantienen su altura de contacto; en extensión pueden acompañar la carrocería tras 75 mm de recorrido.

Comprobar: repetir caída, cámara lenta, compresión, rebote, reposo, órbita táctil y ausencia de errores. Las pruebas locales usan Chromium/SwiftShader con viewport táctil: no sustituyen la revisión en un teléfono físico. Capturas y muestreo determinista en `captures/drop/verification.json` y clip en `captures/drop/slow-motion.mp4`.

La sombra de contacto precalculada del estudio sigue siendo una aproximación heredada; las sombras dinámicas se invalidan durante el movimiento. La carrocería cae rígida, con contacto simultáneo: el cabeceo y las respuestas de impacto no forman parte de esta fase.

Pendiente de aprobación del usuario antes de cualquier Fase 2 (impacto). El documento del plan mencionado en el mensaje no estaba presente entre los archivos recibidos ni en la rama; se implementó el alcance explícito del mensaje.

Exportación del clip: muestreo de la simulación con TAA desactivado y lectura directa del canvas tras cada render para evitar historia temporal entre poses discretas. La vista interactiva conserva el posprocesado original. Reproducir con `node studio/tools/verify-drop.cjs` desde la raíz, servidor HTTP local 8765 y Playwright/Chromium disponibles; codificar los PNG con `ffmpeg -framerate 12 -i studio/captures/drop/frame-%03d.png -c:v libx264 -pix_fmt yuv420p -movflags +faststart studio/captures/drop/slow-motion.mp4`.
