# Revisión 03 · Dinámica, reconstrucción y recursos reales

Continúa la entrega `fdf559e`. El estudio y los materiales del vehículo se conservan. Esta revisión responde a la revisión visual del cliente, no certifica una simulación de ingeniería del vehículo de serie.

## Caída y carga

La caída anterior limitaba artificialmente velocidad y compresión. Se sustituyó por una simulación de cuerpos rígidos Rapier a 240 Hz, reproducida por interpolación a partir de muestras a 120 Hz. No se ejecuta el motor físico completo en el teléfono. La iluminación y los materiales se calculan en vivo sobre las mallas que se mueven.

Parámetros SI: masa suspendida 2.100 kg, cuatro masas no suspendidas de 45 kg, total nominal 2.280 kg; resortes delanteros 62 kN/m y traseros 68 kN/m; amortiguación de compresión 6.500 y extensión 9.000 N·s/m; neumáticos en contacto con el suelo y topes progresivos. **La masa, el reparto y la suspensión son una calibración nominal de presentación; no se recibieron ni verificaron los datos OEM de la variante del cliente.** No se presenta este movimiento como reproducción certificada de una Kia concreta.

La caída física es de 1,25 m. El encuadre comienza mirando al suelo con un campo estrecho y se abre antes del contacto: toda la camioneta empieza fuera de cámara sin simular una caída de siete metros seguida de un asentamiento sin daños. Compresión máxima calculada: unos 17,3 cm. La altura final queda a menos de 2 mm de la de reposo, sin recortar velocidades ni imponer un rebote. El marcador de contacto único procede de la simulación, y sincroniza polvo, piedras, audio, cámara y vibración.

Las seis cajas de 150 kg usan colisiones, gravedad, fricción, restitución baja y un balde conectado al chasis suspendido. La masa total de demostración es 900 kg, distinta del límite comercial anunciado de hasta 1,2 t. La respuesta del chasis y el asentamiento de las cajas vienen del solver: la flecha de suspensión observada, unos 33 mm, coincide con la carga dividida por la rigidez total, dentro de la tolerancia del test. Las cajas superiores descansan sobre las inferiores; no siguen una curva de easing inventada.

Reproducción: instalar `@dimforge/rapier3d-compat@0.21.0` en `/tmp/tasman-r03`, ejecutar `node studio/tools/simulate-r03-rigid.cjs`. Genera `studio/r03-tracks.js` y `assets/r03/rigid-audit.json`. La prueba `node diagnostics/verify-r03-physics.mjs` comprueba masa nominal, velocidad de impacto frente a gravedad, recorrido, reposo y respuesta a carga. La prueba de encuadre incluye cuatro tamaños y reproducción a 3 FPS.

## Escaneo

Franja de reconstrucción de unos 30–50 cm que envuelve la geometría real. Deja durante el barrido una trama reconstruida y destellos localizados sobre las superficies ya cubiertas. Usa la profundidad y oclusión originales de la Tasman, sin un rectángulo ni una copia del vehículo. Al acabar los 4,2 segundos se retira toda la proyección.

## Agua

PlayCanvas aporta el renderizado; la dinámica se calcula con un solver propio de superficie libre Saint-Venant/HLL, conservativo, con gravedad de 9,81 m/s², aporte localizado de caudal y reflexión contra cuatro huellas de neumáticos. El volumen final produce una profundidad media de 800 mm. La simulación tiene 128×128 celdas y pasos de 6 ms. Se comprueba positividad, valores finitos y conservación de masa.

**Es una aproximación de agua somera 2D, no un solver tridimensional de gotas/chorros, SPH ni Navier–Stokes completo.** El caudal es un aporte de inundación de 8 m³/s, no el de un grifo doméstico. Los 38 segundos físicos se comprimen a ocho segundos de presentación. El cálculo se prepara fuera del teléfono en un atlas de alturas de 16 bits; la superficie, las normales, Fresnel, refracción, absorción y reflejos de las luces se renderizan en tiempo real. Referencia técnica estudiada para superficies de agua en WebGL: https://github.com/evanw/webgl-water (`water.js`); no se copian sus paredes de piscina ni se integra su código.

La malla de agua se extiende más allá del encuadre y del plano lejano, con transición atmosférica a distancia; no hay paredes o borde de una caja. La llegada del agua y sus ondas proceden del solver; un espectro de ondas de gravedad pequeñas añade detalle continuo, filtrado según la huella del píxel. Las alturas se prolongan dentro de las huellas sólidas solo para evitar depresiones de interpolación en el render; el campo conservativo y sus métricas no se alteran.

Receta: `python3 studio/tools/simulate-r03-water.py`, después `python3 studio/tools/finish-r03-water.py`. Genera el atlas y `water-simulation.json`. Son datos de estado, no un video prerenderizado: cambios de luces, exposición y materiales siguen afectando la escena.

## Camino y remolque

Roca real escaneada de Paricutín: https://github.com/Sbector/paricutin, commit `71412c862b26b87b293f2f133c6305dffbce9439`, archivo `public/models/paricutin.glb`, MIT, copyright 2024 Sbector. Se incluye la licencia y la fuente original; las rocas conservan escala uniforme y se entierran parcialmente para formar un camino continuo. El camino combina esa geometría y sus UV/texturas, con distintas orientaciones y escalas; se han eliminado las esferas. Se revela como una reconstrucción holográfica durante 2,4 segundos antes de empezar a conducir. El avance posterior es de cuatro metros en nueve segundos, manteniéndose en el estudio iluminado.

El campo de contacto se rasteriza de los mismos triángulos que se ven. El apoyo de cada neumático se calcula como envolvente de una rueda de 405 mm, incluyendo el borde delantero de las rocas. Los cuatro apoyos ajustan altura, cabeceo, balanceo y recorrido por rueda; el giro se obtiene de distancia/radio. Es seguimiento cuasiestático sobre geometría real, no una simulación completa de transmisión/neumáticos sobre tierra. La cámara acompaña la marcha sin teletransportar el vehículo al comenzar; la huella de sombra del estudio también sigue su desplazamiento. No se muestran anillos de depuración bajo las ruedas.

Remolque: CAD existente del remolque Harbor Freight usado en el proyecto https://github.com/BarbourSmith/Sauna-Trailer, commit `78855e10b62a9f3de241d66004a436a361ab5b7d`, subconjunto `Trailer` en `project.abundance`, CC0. Se incluye el subconjunto fuente y el texto de licencia. La importación evalúa únicamente sus operaciones geométricas conocidas y sus dimensiones; no reconstruye un remolque genérico a base de cajas. Los contornos se extraen de las aristas de esa malla CAD. Es un modelo comunitario de un remolque de plataforma, no un CAD OEM certificado ni un modelo de semirremolque.

Receta: glTF Transform y Meshoptimizer según la revisión anterior, más `@jscad/modeling@2.13.0` en `/tmp/tasman-r03`. `node studio/tools/build-r03-assets.cjs`; luego `python3 studio/tools/build-r03-road-height.py`. Para el presupuesto móvil, las dos imágenes del camino se limitan a 1K mediante `python3 studio/tools/resize-r03-road.py`. JSCAD es MIT, Rapier Apache-2.0; no se redistribuyen fotos de referencia de terceros sin permiso.

## Validación

Evidencias nuevas en `evidence/revision-03`. El recorrido y 25 ciclos acelerados de creación/destrucción se prueban con Chromium/SwiftShader, control temporal explícito y mensajes de consola. Las muestras controladas no certifican FPS en hardware móvil. La medición física en el Android del cliente y Safari/iPhone sigue pendiente. El destinatario oficial de WhatsApp y la fuente de marca siguen sin suministrarse; la configuración existente se conserva.
