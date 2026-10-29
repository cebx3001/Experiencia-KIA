# Recursos y referencias del nuevo estudio

Esta escena se implementa en `studio/` con un renderizador independiente. No importa `kia-playcanvas-renderer.js` ni `tasman-estudio-porsche.html` y no cambia la página principal.

- **Studio Small 09**, Sergej Majboroda / Poly Haven, HDR Radiance 4K, 18 EVs, licencia CC0. Fuente: https://polyhaven.com/a/studio_small_09 . Archivo descargado desde la URL del manifiesto oficial: https://api.polyhaven.com/files/studio_small_09 . El entorno se usa para iluminación y reflejos; no se dibuja como fondo con luminarias visibles.
- **Tablas LTC para luces de área**: recurso oficial de PlayCanvas https://playcanvas.github.io/web-components/examples/assets/json/area-light-luts.json . Motor PlayCanvas 2.23.1, licencia MIT: https://github.com/playcanvas/engine/blob/v2.23.1/LICENSE .
- **Especificación de barniz multicapa**: https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Khronos/KHR_materials_clearcoat . La normal de base es `normalTexture`; la normal del barniz es `clearcoatNormalTexture`; la rugosidad del barniz se almacena en el canal G de `clearcoatRoughnessTexture`.
- **Iluminación ambiental**: https://developer.playcanvas.com/user-manual/graphics/physical-rendering/environment-lighting/ .
- **Conversión de reflectancia**: parámetros físicamente basados de Unreal https://dev.epicgames.com/documentation/en-us/unreal-engine/physically-based-materials-in-unreal-engine y definición de `KHR_materials_specular` https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Khronos/KHR_materials_specular . Código de importación y Fresnel del motor fijado: https://github.com/playcanvas/engine/blob/v2.23.1/src/framework/parsers/glb-parser.js y https://github.com/playcanvas/engine/tree/v2.23.1/src/scene/shader-lib .
- **Luces rectangulares nativas**: https://developer.playcanvas.com/user-manual/editor/scenes/components/light/ . No se crean mallas de paneles.
- **Posprocesado CameraFrame**: https://github.com/playcanvas/engine/blob/v2.23.1/src/extras/render-passes/camera-frame.js . HDR, TAA, AO de iluminación y bloom moderado.
- **Referencia automotriz PlayCanvas**: BMW i8, Polaris e Indian Motorcycles, publicados en https://playcanvas.com/explore . Se usan como referencia de calidad, sin copiar sus recursos.
- **Pinturas**: nombres, códigos y muestras digitales del configurador oficial https://build.kia-tasman.com/ . El código público del configurador publica AGT `#262931`, ABP `#091113`, CGE `#404c47`, TAM `#8b806e`. Las muestras digitales no son mediciones espectrales de la pintura. Tan Beige conserva el material existente de Unreal; las variantes adicionales usan referencias Kia sobre el grafo automotriz existente. ABP activa la función de acabado perlado de ese grafo.

Los grafos, funciones y texturas del vehículo proceden del maestro Unreal existente y del Automotive Materials Pack de Epic ya incorporado al proyecto. Los archivos fuente cinematográficos se conservan.
