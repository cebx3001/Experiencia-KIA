# Visor Kia Tasman integrado — 5 de noviembre de 2026

## Estado recuperado

- Pages publicaba `feat/tasman-unreal-studio`, raíz `/`, commit `013c9fa`; no publicaba `main`.
- `main` estaba en `da32101`, una interfaz gráfica sin motor 3D. La retirada del motor se confirma en `647404a` y `c722cd3`.
- La última actualización funcional de `app.js` antes de su retirada es `31dd47f`; se recuperó ese controlador. HTML, CSS, carrusel y anotaciones funcionales se recuperaron del conjunto compatible `791f974`. Los archivos de la presentación gráfica posterior `tasman-nueva.*` permanecen disponibles.
- Se examinaron también `feat/playcanvas-studio-tasman` (`c9af6fd`, iluminación anterior con tarjetas dibujadas en canvas) y `feat/tasman-true-hdri-cameraframe` (`1099449`). No se confundieron con el estudio 360 actual.
- La optimización ya existente era Draco y un atlas RGBP GGX 1024 precalculado y comprobado byte a byte. Evita convertir/prefiltrar el HDR al arrancar; no es una imagen del automóvil. No había perfiles adaptativos de descarga/texturas/renderizado.

## Integración

`index.html` vuelve a cargar `app.js`, que mantiene los carruseles de cámaras, colores, exterior, interior y desafíos. `kia-carousel.js` y `kia-annotations.js` conservan sus datos y lógica de selección.

`kia-playcanvas-renderer.js` es ahora un adaptador, no otro renderizador. Monta `studio/?embed=1` en el escenario original y conecta su única aplicación PlayCanvas con la API del visor original. Se elimina el canvas inactivo anterior. La interfaz aislada del estudio se oculta al embeberlo; el motor y sus materiales son los mismos en ambas entradas. Las coordenadas de inspección se interpretan en metros normalizados del modelo, evitando aplicar dos veces su transformación raíz.

Se conservan los ángulos/elevaciones de las cinco poses originales, cámaras de detalle, transición hacia cabina, apertura de cuatro puertas, selección de características y descripciones. El encuadre se adapta al aspecto del viewport. Los desafíos y sus diálogos siguen el controlador existente; no se añadieron vídeos que no existieran.

La selección de pintura se aplica a todas las instancias identificadas por su material original Premium Paint. Esto compensa las asociaciones de variantes perdidas por el antiguo `join`, sin tintar cristales, plásticos ni interiores y sin modificar el GLB maestro.

## Optimización añadida

| Perfil | GLB | Descarga del modelo | Textura máxima |
|---|---|---:|---:|
| Móvil / memoria reducida | `studio/assets/kia-tasman-mobile.glb` | 32.116.960 bytes | 1024 |
| Intermedio | `studio/assets/kia-tasman-balanced.glb` | 45.207.944 bytes | 2048 |
| Alto | `studio/assets/kia-tasman-web.glb` | 83.633.164 bytes | 4096 |

Los perfiles nuevos mantienen exactamente los buffers Draco de geometría, articulaciones y animaciones. Se redimensionan las imágenes, conservando PNG para no introducir pérdidas de codec en normales o canales PBR. No se redujeron polígonos ni se eliminaron partes. El maestro y el GLB web de alta calidad permanecen intactos.

`studio/adaptive-quality.js` selecciona por entrada táctil, memoria, núcleos y GPU dedicada cuando puede identificarse. Móvil o memoria declarada de hasta 4 GB eligen el perfil móvil. La falta de información no fuerza el perfil alto. Una ventana sostenida de frames lentos reduce progresivamente la resolución de render, hasta DPR 0,6; no cambia la BRDF ni elimina luces o funciones. Se ajustan muestras de SSAO, resolución de sombras y resolución del reflejo planar. `preserveDrawingBuffer` está desactivado.

Para inspección reproducible: `?quality=mobile`, `balanced` o `high`, tanto en raíz como en `/studio/`. Las texturas se decodifican a RGBA en GPU: no se implementó KTX2/Basis ni se debe afirmar compresión GPU. El ahorro de memoria procede de la resolución. El perfil alto conserva las texturas originales del estudio.

Se mantienen Clear Coat y segunda normal, roughness/metalness, transmisión de cristales, materiales separados, luces LTC y acentos dinámicos, sombras del vehículo, reflejo planar y respuesta óptica al cambiar cámara/materiales. El HDR representa el entorno del estudio, no fotogramas del vehículo. La sombra de contacto del suelo heredada sigue siendo estática para puertas cerradas; no es una optimización nueva.

## Reproducir y límites

Servir la raíz con `python -m http.server 8770 --bind 127.0.0.1`. El generador de perfiles está en `studio/tools/build_adaptive_assets.py`; requiere Python, Pillow y NumPy. El catálogo resultante es `studio/assets/adaptive-assets.json`.

Se comprobaron ambos GLB con glTF Validator: cero errores y advertencias; el validador informa que no inspecciona internamente Draco, cuya decodificación se probó en el navegador. Las pruebas de navegador incluyen poses, cuatro colores sin paneles rezagados, puertas ±65°, anclas de características y vistas interiores. Los resultados y capturas de ejecución se entregan fuera del repositorio en la carpeta `outputs/` del trabajo.

Las pruebas se ejecutan en Chrome del equipo disponible y con viewports/táctil y CPU limitada; no representan mediciones de teléfonos físicos ni de varias GPU físicas. La memoria observada de texturas fue aproximadamente 727 MB en intermedio y 189 MB en móvil, incluyendo recursos del estudio; varía con viewport y render targets. No se garantiza una cifra universal de FPS.

Persisten las limitaciones de UV subtexel y tangentes de la auditoría anterior. Esta integración conserva los materiales actuales y no declara solucionado su microdetalle. Las correcciones de barniz/refracción de `studio/material-adapter.js` se preservan.

Fuentes de optimización consultadas: https://developer.playcanvas.com/user-manual/optimization/texture-compression/ y https://developer.playcanvas.com/user-manual/optimization/guidelines/ . La elección aplicada prioriza una entrega comprobable con el motor fijado 2.23.1 y conserva el perfil alto.

Se corrigió además una regresión de encuadre vertical: con FOV horizontal no debe multiplicarse la distancia por el aspecto de pantalla, porque la cámara salía del ciclorama y la pared ocultaba el vehículo. Se confirmó el resultado con una captura móvil completa. Los tiempos de carga registrados son de esta máquina y no deben interpretarse como una prueba de red 4G.
