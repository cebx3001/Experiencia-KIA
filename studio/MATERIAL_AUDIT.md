# Auditoría de exportación Unreal → PlayCanvas

Se consultaron las catorce instancias finales del maestro en una copia aislada de Unreal 5.8.4. El Blender original aporta geometría, UV y articulación; los materiales proceden de Unreal, incluyendo las funciones del Automotive Materials Pack.

## Defecto encontrado y corregido

La exportación inicial con `USE_MESH_DATA` advertía UV solapadas y degeneradas. En piezas con UV casi puntuales, la rasterización del horneado no cubría los texeles necesarios: el material metálico exterior presentó una mediana de error de unos 91/255 en rojo y azul frente al atlas original, aplicando el piso de reflectancia del grafo.

Se reexportaron nativamente en modo `SIMPLE`, PNG 4096 × 4096, las nueve superficies opacas dirigidas por UV: Car, Interior, Licence Plate, Tire Rubber, Wheel Metal, Exterior Metal, Interior Metal, Interior Textile y Seat Leather. Conservan la respuesta del grafo; no se sustituyeron por colores planos. El nuevo horneado no depende de que una cara diminuta cubra píxeles del atlas. En las muestras evaluadas, el percentil 95 del error por canal queda aproximadamente en 1/255 o menos. Los informes anteriores y posteriores conservan las muestras y métricas.

La pintura conserva `USE_MESH_DATA`, necesario para sus detalles con proyección espacial. Sus capas mantienen mapas normales independientes, procedentes del Normal exterior y Clear Coat Bottom Normal. No se cambió su proyección a UV de objeto.

## Parámetros y convenciones comprobados

- Pintura fuente: rugosidad 0,34; metalicidad 0,60; Clear Coat 1; rugosidad de barniz 0,025–0,07; Orange Peel 0,012; densidad de flakes 0,04. El mapa DetailRoughness de la instancia final es negro, por lo que el exportador obtiene una rugosidad constante cercana al mínimo. Su factor horneado es 6/255, 0,023529, por cuantización de ocho bits. La rugosidad base horneada es 87/255, 0,341176. Los parámetros fuente exactos quedan registrados.
- Base Color original importado en sRGB. Roughness, Metallic y Normal importados en lineal. Sin LOD bias ni límite de tamaño de textura en las instancias auditadas.
- Las normales originales ya tienen `flip_green_channel=True` en Unreal. El exportador evalúa esa configuración y ajusta una vez la salida a glTF. PlayCanvas no vuelve a invertir el verde. La prueba numérica de mapas y las pruebas A/B no detectan una inversión global del relieve.
- Normal de base y normal del barniz no se intercambian ni se fusionan. PlayCanvas usa roughness con `glossInvert=True`, incluyendo el barniz.
- La geometría articulada coincide con los triángulos asignados a cada una de las catorce superficies del maestro Unreal. En el muestreo de correspondencia, el error de posición es inferior a 0,000003 m. El percentil 95 de las diferencias de normales geométricas es inferior a 0,04°. Esta métrica se refiere a geometría, no a un juicio de igualdad visual.

## Resolución y muestreo

Las 22 texturas originales son de 8000 × 8000 y se conservan íntegramente en el archivo de entrega local `Fuentes_Originales_8K.zip`. Los horneados nativos de material entregados son de 4096 × 4096. La versión web comprime geometría con Draco; conserva exactamente los bytes PNG de esos horneados. Esta igualdad entre maestro y web no implica igualdad de resolución con los originales de 8K.

La auditoría adicional de Metallic/Roughness evalúa 10.000 muestras por superficie en Car, Tire Rubber, Wheel Metal, Exterior Metal e Interior Metal. El percentil 95 del error de metalicidad es cero; el de rugosidad queda por debajo de 0,6/255 tras aplicar la función de remapeo de cada instancia. Los metales de ruedas y exterior conservan metalicidad 1. La falta de contraste inicial no justificaba reducir su rugosidad ni alterar sus mapas.

## Adaptaciones físicas en PlayCanvas 2.23.1

`material-adapter.js` es independiente del renderizador antiguo y conserva los mapas nuevos.

1. Restaura la intensidad Clear Coat declarada en glTF, reducida por el importador a una cuarta parte. En el cálculo LTC distingue intensidad de recubrimiento y F0 dieléctrico 0,04. La reflectancia del barniz no se trata como F0 igual a 1.
2. En el camino LTC, el acumulador especular se restablece a 1 después de evaluar los reflejos. La refracción dinámica recibía ese valor como F0 y anulaba la transmisión. Para estos cristales no metálicos se reconstruye F0 desde IOR 1,52, aproximadamente 0,04258. Se mantienen transmisión física completa y tintes RGB del material fuente; la opacidad de Unreal queda registrada para trazabilidad y no se convierte directamente en transparencia glTF.
3. `VertexNormalWS` en el vidrio corresponde a las normales geométricas. Se omiten mapas normales redundantes para estos materiales.
4. Se convierte la escala Specular de Unreal a la escala de glTF. El exportador Thin Translucent no conserva su salida personalizada Transmission Color ni el IOR de la instancia; esos valores se restauran desde las instancias auditadas.

Los fragmentos personalizados se aplican sólo a los materiales afectados y comprueban la firma del código del motor fijado. Una actualización incompatible debe fallar explícitamente y revisarse.

## Estudio y comparación

Set cinematográfico independiente con siete luminarias LTC, emisores de perfil graduado, entorno HDR 4096 × 2048 horneado mediante Cycles y suelo neutro coherente en los reflejos. El origen de captura es (0, 1, 0) m; se conserva al proyectar localmente el entorno sobre el vehículo. Las normales y los valores ópticos de los materiales no cambian durante esta calibración.

Las pruebas con Studio Small 02, Studio Small 04 y el HDR del ejemplo Porsche sirvieron para evaluar distribución y rango de los reflejos. Se eligió el entorno propio para controlar el parabrisas y las transiciones de carrocería. El HDR Porsche permanece como recurso de investigación y no se redistribuye. El relleno trasero se elevó después de aislar la reflexión ambiental: el velo gris lateral desaparece al retirar esa reflexión sin cambiar la transmisión. Las pruebas con sombras adicionales no lo resolvían.

El set usa sombras VSM32 con filtro gaussiano de 25 texeles y ACES fitted. El rebote indirecto se aproxima con SH de orden 2, excluyendo las direcciones de emisores que ya iluminan mediante LTC. Las reflexiones utilizan el entorno HDR completo con proyección local. Es una aproximación de tiempo real, sin trazado de caminos ni reflexión completa del vehículo sobre sí mismo. No se intenta copiar la iluminación de las referencias Unreal.

El contacto del suelo se horneó mediante oclusión por rayos contra toda la geometría real. Es un recurso del estudio, no un AO del vehículo inventado desde roughness. Es estático con puertas cerradas; las sombras de las luminarias sobre el vehículo y el SSAO son dinámicos. El modelo usa máscaras de luz separadas del suelo para evitar varias sombras duras de focos sobre éste.

La referencia hero usa una focal equivalente de 48 mm, mismo lado y composición aproximada de la referencia proporcionada. Las capturas son renders reales del navegador, sin corrección de color posterior. No son una medición espectral ni una declaración de igualdad píxel a píxel entre motores. Los efectos procedurales dependientes de vista, incluida la perla de ABP, se representan mediante el horneado y la respuesta especular; el grafo completo de Unreal no se ejecuta en el navegador.

## Evidencia

- `assets/audit/source-materials.json`: instancias, texturas y grafos consultados.
- `assets/audit/basecolor-mesh-bake-before.json` y `basecolor-plane-bake-after.json`: corrección de la cobertura de horneado.
- `assets/audit/normal-plane-bake-after.json`: orientación y diferencia angular de mapas frente a las fuentes PNG; las diferencias locales incluyen compresión de importación y filtrado.
- `assets/audit/geometry-uv-normal-correspondence.json`: correspondencia geométrica y UV.
- `assets/audit/metallic-roughness-plane-bake-after.json`: canales de metalicidad y rugosidad frente a sus fuentes.
- `assets/audit/studio-probe-bake.json` y `studio-indirect-sh.json`: horneado del estudio y rebote indirecto.
- `assets/texture-integrity.json`: dimensiones, CRC PNG comprobado por decodificación y SHA-256.
- `assets/gltf-validation-master.json`, `gltf-validation-web.json`: validación de los archivos entregados.
- `render-verification.json`: navegador, GPU real y controles comprobados.

Referencia de Epic para cambiar a Simple ante UV de malla inadecuadas: [How the glTF Exporter Handles Unreal Engine Content](https://dev.epicgames.com/documentation/en-us/unreal-engine/how-the-gltf-exporter-handles-unreal-engine-content).
