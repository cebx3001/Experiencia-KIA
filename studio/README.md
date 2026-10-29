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

## Estudio de iluminación de 360°

El estudio combina el HDR original 4K y su rebote indirecto SH con fuentes rectangulares LTC de reflexión especular. Tiras longitudinales estrechas dibujan las concavidades de las puertas y continúan sobre aletas y caja; fuentes frontal, posterior y de techo recortadas mantienen transiciones durante la órbita. Dos bancos enlazados al metal de las ruedas permiten dirigir sus brillos sin lavar la pintura. Se corrigió la orientación vertical de la fuente de techo. La camioneta permanece estática mientras orbita la cámara.

Se conservaron el vehículo, los mapas, los parámetros PBR y los adaptadores de barniz y vidrio del handoff. El atlas de entorno guardado contiene exactamente el prefiltrado original del motor a 1024/1024: acelera la carga sin reducir su resolución. Esta revisión sustituye la propuesta descartada de diez bancos/HDR 2K.

Configuración: `assets/studio-lighting.json`. Comparación técnica y límites de acceso a referencias: [REFERENCE_COMPARISON.md](REFERENCE_COMPARISON.md). Construcción y límites del suelo y los materiales: [LIGHTING_STUDY.md](LIGHTING_STUDY.md). Prueba reproducible de 16 perspectivas: `tools/verify-studio.cjs`.

Los selectores de variantes siguen disponibles, pero el GLB web conserva el defecto conocido de cobertura incompleta: no todos los paneles cambian. Los mapas de normales conservan UV subtexel; no debe interpretarse su presencia como microdetalle recuperado.

## Materiales y adaptaciones

Los mapas se hornean desde las instancias del proyecto Unreal existente. Se conservan los mapas de pintura existentes. La auditoría posterior identificó UV subtexel y normales prácticamente constantes: no se afirma conservación óptica de escamas y piel de naranja. No se reutiliza el renderizador anterior ni sus sustituciones por nombre de material.

- `normalTexture` recibe la normal de base de Unreal (`Clear Coat Bottom Normal`). `clearcoatNormalTexture` recibe la normal exterior. Se mantienen como mapas independientes. La conversión de la normal se realiza una vez en el exportador; no se invierte de nuevo el canal verde.
- El barniz usa `KHR_materials_clearcoat`. El exportador simplifica su rugosidad a un factor constante cuando el horneado lo detecta constante. Los mapas de normales siguen separados, pero la auditoría identifica UV subtexel y muestreo casi constante; no se afirma haber recuperado microdetalle procedural.
- El horneado nativo de CustomData0/1 falla con Substrate en Unreal 5.8.4. Se usa una copia exclusiva para exportación con el renderizador clásico; no se cambia la configuración cinematográfica ni el motor instalado.
- `material-adapter.js` distingue intensidad del barniz y F0 dieléctrico en LTC. Corrige también la pérdida de transmisión al recibir la refracción el acumulador especular LTC igual a 1; conserva IOR 1,52 y tintes RGB. No convierte la opacidad de Unreal directamente a transparencia.
- Nueve materiales opacos se rehornearon en `SIMPLE` para corregir texeles sin cobertura por UV degeneradas en el horneado sobre malla. La pintura conserva horneado sobre malla por sus detalles proyectados en el espacio.
- No existe un mapa AO independiente en las fuentes. Se emplea oclusión ambiental en tiempo real; no se fabrica un AO a partir de la rugosidad.
- Tan Beige conserva la pintura del maestro existente. AGT, ABP y CGE se derivan del mismo grafo usando las muestras digitales oficiales de Kia. ABP habilita la función perlada. Son referencias digitales, no mediciones espectrales del fabricante.

Las 22 texturas originales de 8000 × 8000 se conservan en el archivo de entrega local `Fuentes_Originales_8K.zip`, con manifiesto SHA-256. Las fuentes originales no se publican en este repositorio. Los mapas de material que carga el visor son horneados nativos de Unreal de 4096 × 4096; no conservan todo el detalle de sus fuentes de 8K.

Los mapas horneados y el catálogo de materiales están en `assets/textures/` y `assets/materials.json`. Cada imagen incluye el nombre de procedencia, el archivo PBR y su SHA-256. Fuentes externas, licencias y especificaciones: [ASSET_SOURCES.md](ASSET_SOURCES.md).

## Verificación

Las capturas heredadas se conservan en `captures/`. La revisión actual guarda vistas sin retoque en `captures/premium-360/`, el índice en [captures/studio-360.jpg](captures/studio-360.jpg), la comparación a igual cámara en [captures/lighting-comparison.jpg](captures/lighting-comparison.jpg) y las comprobaciones funcionales en `studio-360-verification.json`. El informe técnico no certifica por sí solo calidad publicitaria. `assets/compression-report.json` registra la precisión de geometría y la igualdad de las texturas. Los archivos fuente cinematográficos permanecen recuperables en el proyecto original.

La auditoría detallada, sus límites y las correcciones están en [MATERIAL_AUDIT.md](MATERIAL_AUDIT.md). Catálogo de mapas: [PBR_MAPS.md](PBR_MAPS.md).
