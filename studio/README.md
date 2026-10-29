# Kia Tasman — estudio publicitario PlayCanvas

Escena independiente en `studio/index.html`. Conserva intactas la página principal y las escenas anteriores del repositorio.

## Abrir

Desde la raíz del repositorio:

```sh
python -m http.server 8765 --bind 127.0.0.1
```

Abrir http://127.0.0.1:8765/studio/ . El visor carga recursos locales y necesita un servidor HTTP; abrir el HTML mediante `file://` impide cargar el modelo.

El GLB maestro está gestionado con Git LFS. Después de clonar, ejecutar `git lfs pull` para descargarlo. La versión de navegador usa Draco y mantiene intactos los bytes de las texturas PBR.

## Vehículo y controles

- Cuatro pinturas mediante `KHR_materials_variants`: TAM / arena, AGT / gris, ABP / negro y CGE / verde. Sólo las caras del material `Premium_Paint` reciben variantes.
- Cuatro puertas independientes, controles de apertura, diez clips de transformación y anotaciones recuperadas.
- Cámara orbital de 360°, zoom, desplazamiento con Mayús, vistas de detalle e interior.
- Maestro con las 1.410 piezas originales, sus nombres y pivotes; controles semánticos insertados para articulación. La versión web agrupa geometría compatible dentro de cada componente, conservando las entidades y las articulaciones.
- Misma geometría fuente del maestro: 1.925.337 vértices y 1.870.663 polígonos antes de triangulación. Las reglas de asignación de las catorce superficies reproducen los grupos del maestro Unreal.

## Set construido para esta escena

Ciclorama circular, ocho luminarias rectangulares LTC y un entorno HDR 4K propio. La iluminación se diseñó para dar volumen y separar los acabados, usando Unreal como referencia de calidad de materiales. No reproduce su disposición de luces ni su parabrisas sobreexpuesto.

La dirección actual es fotografía publicitaria automotriz independiente. Se evaluaron grandes difusores, tiras y tarjetas graduadas manteniendo bloqueados los materiales del vehículo. El set elegido combina una luz lateral principal, separación de techo y trasera, relleno frontal, tarjetas de rebote y un reflejo estrecho calculado para el parabrisas. El capó recibe una transición amplia sin convertir el cristal en una superficie blanca.

El HDR propio de 4096 × 2048 se horneó a 64 muestras en un estudio vacío. La proyección local conserva el origen de captura y los armónicos esféricos separan el rebote de las luces directas. Cámara frontal de tres cuartos con campo horizontal de 37°, exposición 0,75 y ACES fitted.

El suelo combina iluminación PBR, sombra horneada como cociente de irradiancia con/sin vehículo y un reflejo planar suave. La sombra horneada corresponde a puertas cerradas; las sombras del vehículo y la oclusión en pantalla siguen siendo dinámicas. El reflejo planar usa una captura de resolución reducida y formato RGBA8, por lo que es una aproximación visual, no trazado de rayos. CameraFrame aporta HDR, TAA, AO y bloom moderado.

La auditoría `assets/audit/advertising-material-preservation.json` verifica que los GLB, mapas, catálogo y adaptador de materiales no cambiaron durante esta etapa. Véase [LIGHTING_STUDY.md](LIGHTING_STUDY.md).

## Materiales y adaptaciones

Los mapas se hornean desde las instancias del proyecto Unreal existente. Se conservan las funciones de pintura automotriz, las escamas y la piel de naranja en los mapas resultantes. No se reutiliza el renderizador anterior ni sus sustituciones por nombre de material.

- `normalTexture` recibe la normal de base de Unreal (`Clear Coat Bottom Normal`). `clearcoatNormalTexture` recibe la normal exterior. Se mantienen como mapas independientes. La conversión de la normal se realiza una vez en el exportador; no se invierte de nuevo el canal verde.
- El barniz usa `KHR_materials_clearcoat`. El exportador simplifica su rugosidad a un factor constante cuando el horneado lo detecta constante. Los mapas normales conservan la variación de la superficie; los efectos dependientes de vista no tienen equivalencia completa en un mapa estático.
- El horneado nativo de CustomData0/1 falla con Substrate en Unreal 5.8.4. Se usa una copia exclusiva para exportación con el renderizador clásico; no se cambia la configuración cinematográfica ni el motor instalado.
- `material-adapter.js` distingue intensidad del barniz y F0 dieléctrico en LTC. Corrige también la pérdida de transmisión al recibir la refracción el acumulador especular LTC igual a 1; conserva IOR 1,52 y tintes RGB. No convierte la opacidad de Unreal directamente a transparencia.
- Nueve materiales opacos se rehornearon en `SIMPLE` para corregir texeles sin cobertura por UV degeneradas en el horneado sobre malla. La pintura conserva horneado sobre malla por sus detalles proyectados en el espacio.
- No existe un mapa AO independiente en las fuentes. Se emplea oclusión ambiental en tiempo real; no se fabrica un AO a partir de la rugosidad.
- Tan Beige conserva la pintura del maestro existente. AGT, ABP y CGE se derivan del mismo grafo usando las muestras digitales oficiales de Kia. ABP habilita la función perlada. Son referencias digitales, no mediciones espectrales del fabricante.

Las 22 texturas originales de 8000 × 8000 se conservan en el archivo de entrega local `Fuentes_Originales_8K.zip`, con manifiesto SHA-256. Las fuentes originales no se publican en este repositorio. Los mapas de material que carga el visor son horneados nativos de Unreal de 4096 × 4096; no conservan todo el detalle de sus fuentes de 8K.

Los mapas horneados y el catálogo de materiales están en `assets/textures/` y `assets/materials.json`. Cada imagen incluye el nombre de procedencia, el archivo PBR y su SHA-256. Fuentes externas, licencias y especificaciones: [ASSET_SOURCES.md](ASSET_SOURCES.md).

## Verificación

Las capturas reales y el informe de ejecución se guardan en `captures/` y `render-verification.json` después de la revisión final. `assets/compression-report.json` registra la precisión de geometría y la igualdad de las texturas. Los archivos fuente cinematográficos permanecen recuperables en el proyecto original.

La auditoría detallada, sus límites y las correcciones están en [MATERIAL_AUDIT.md](MATERIAL_AUDIT.md). Catálogo de mapas: [PBR_MAPS.md](PBR_MAPS.md).
