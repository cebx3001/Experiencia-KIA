# Reflejos que describen la carrocería

La propuesta anterior de diez bancos/HDR 2K fue rechazada visualmente y está sustituida. Haber generado dieciséis capturas sin errores no la hacía mejor que el estudio del handoff.

## Construcción actual

Se conserva el HDR original 4096×2048, los SH indirectos y los parámetros de los ocho emisores heredados. El especular directo LTC vuelve a estar activo. La proyección local mantiene origen (0,1,0), centro (0,3.5,0) y semiextensiones (7,3.5,7). Se conservan exposición 0,75, ACES fitted, TAA, SSAO y vidrio físico.

Las nuevas fuentes son **reflectores estrechos y fijos**, no un relleno uniforme: tiras longitudinales bajas a ambos lados, continuidad frontal/trasera y un reflector alto recortado. Su extensión cubre las direcciones especulares al pasar de perfil a tres cuartos. La altura se eligió calculando las direcciones reflejadas de las normales reales de puertas y portón, y comparando capturas con la misma cámara. La franja se curva sobre la concavidad inferior de las puertas y se deforma en aletas y caja.

Los rines conservan su material original. Dos aportes bajos enlazados al metal de rueda mediante máscara 4 resaltan biseles sin aumentar el relleno de toda la carrocería. Las mallas de rueda mantienen también máscara 1; reciben todas las fuentes principales. No se recolorean como cromo ni se aclara su albedo. Estos enlaces son una decisión de dirección de iluminación, no una simulación de transporte de luz completo.

Se corrigió la base degenerada de `lookAt` cuando la fuente mira verticalmente. Se usa un vector superior ortogonal; la luz de techo ahora emite hacia abajo. Los emisores se mantienen en coordenadas de mundo y sólo se mueve la cámara.

## Qué se descartó

- Especular LTC desactivado y atlas reducido: perdían los brillos que daban calidad a la base.
- Bancos grandes de baja radiancia: aumentaban cobertura, pero mantenían los paños planos.
- Tiras demasiado intensas: blanqueaban la pintura y reducían su profundidad.
- Tiras demasiado cortas: el reflejo desaparecía cerca del frontal.
- Un reflector de techo demasiado extenso: producía una zona gris uniforme; se recortó.

## Calidad de captura y recursos

El atlas de `studio-env-atlas-rgbp.bin` es el prefiltrado original 1024/1024 del motor, guardado como bytes RGBP nativos. La lectura y recarga GPU se compararon: 4.194.304 bytes, cero diferencias. No es un HDR reducido ni una fotografía LDR. Fuente, versión del motor y hashes están en `studio-env-atlas.json`. El propósito de guardarlo es repetir comparaciones con calidad idéntica sin recalcular miles de millones de muestras al iniciar.

Las comparaciones reproducidas usan GLB web, cámara horizontal 37°, distancia 10,7m, elevación 0,14, exposición 0,75 y ocho fotogramas renderizados completos antes de cada captura. La órbita usa elevación 0,16 y las vistas elevadas 0,55/distancia 14m para mantener el vehículo completo dentro del encuadre. No basta con esperar un segundo en software: TAA necesita fotogramas reales. Las capturas originales 4K del maestro se mantienen como referencia independiente.

No se cambiaron GLB, mapas, manifiestos ni los adaptadores de barniz/Fresnel y vidrio. El maestro se recuperó por LFS y se verificó su SHA-256 original. Las limitaciones conocidas de variantes web y UV no se presentan como reparadas. El contacto del suelo conserva el horneado cerrado de las fuentes principales; los nuevos reflectores no iluminan el suelo. Las puertas abiertas mantienen la aproximación de contacto existente. El reflejo planar RGBA8 sigue siendo aproximado.

La revisión artística debe comprobar las curvas y gradientes durante toda la órbita, conservar zonas oscuras y lectura de cristales, y evitar blancos planos. La prueba técnica valida funcionamiento y estabilidad; no certifica por sí sola calidad publicitaria ni rendimiento de hardware móvil.


## Lectura visual de la revisión

La comparación a igual cámara se guarda en `captures/lighting-comparison.jpg`; los PNG originales están en `captures/premium-comparison/`. En ambos perfiles, el reflejo se curva en la concavidad inferior de las puertas y se separa de la zona oscura del zócalo. En tres cuartos se desplaza hacia la cintura y se quiebra en las aletas; no se fija artificialmente a las coordenadas de pantalla. El portón recibe un gradiente que permite leer el relieve KIA y separarlo de pilotos y paragolpes. El capó conserva el modelado del entorno heredado y los rines muestran biseles claros sobre metal negro.

En vistas elevadas, las puertas reflejan principalmente el suelo y la franja baja deja de dominarlas; el brillo pasa a techo, capó y bordes de caja. La respuesta cambia con el ángulo, como corresponde a un estudio fijo. No se exige una raya blanca simultánea sobre cada panel. La limitación de microdetalle UV sigue documentada y no se presenta como resuelta por iluminación.

Se conservaron márgenes de encuadre en las vistas elevadas, además de comprobar el render. El índice reducido está en `captures/studio-360.jpg` y cada captura sin retoque en `captures/premium-360/`. Las comprobaciones funcionales y la procedencia de recursos/capturas están en `studio-360-verification.json`.
