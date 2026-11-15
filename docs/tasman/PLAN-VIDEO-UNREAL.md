# Experiencia KIA Tasman · Producción de video y navegación en móvil

La entrega usa videos generados. La introducción completa, incluidas la caída, la órbita y el escaneo, las seis pruebas y los clips entre vistas salen del generador. El estudio existente en Unreal aporta referencias de la Tasman color arena y de la posición, el encuadre y el recorrido de la cámara. Las capturas de la demo de PlayCanvas sirven como referencia de acción y ritmo. El teléfono reproduce los videos y fotogramas sin descargar la malla GLB ni abrir el estudio WebGL.

## 1. Preparar las referencias

1. Desde el estudio de Unreal, exportar el tres cuartos frontal de referencia, la guía de la órbita de 360° y vistas de la Tasman cada 45°, con detalles de carrocería, ruedas, paila y cabina. Preparar las cinco poses de referencia —tres cuartos frontal, frontal, lateral, trasera y tres cuartos superior— y exportar como guías los recorridos entre poses contiguas. Incluir los fotogramas de inicio y llegada de cada movimiento. Para la caída y las pruebas, usar las guías ya disponibles y las láminas aprobadas.
2. Usar las láminas aprobadas para la dirección artística y los estados de armado de cada entorno. Usar las [capturas de Revisión 03](evidence/revision-03/index.html) para la caída y el escaneo, y los [clips de Revisión 02](evidence/revision-02/index.html) para las acciones de las cinco pruebas originales. Storm parte de su lámina aprobada. Las guías de Blender ya preparadas también sirven como referencia de movimiento y geometría.
3. Fijar el tres cuartos maestro para el acabado final a partir de la referencia de estudio. Usar exactamente ese mismo fotograma al inicio y al final de los siete videos y como toma central de la página. En los clips auxiliares, usar el fotograma exacto de cada pose en el extremo que le corresponda.

## 2. Producir y revisar siete videos

Generar mediante OpenRouter. Runway es la primera opción para el piloto de continuidad. Seedance, MiniMax u otro modelo son alternativas según el tipo de referencia que acepte y su resultado. Usar las guías de Unreal para conservar la Tasman, el encuadre y la trayectoria de cámara. Si el modelo admite video guía, usar el recorrido exportado. En los modos por imagen, usar los fotogramas de inicio y llegada que admita el modelo y comprobar el empalme en montaje.

Producir en el orden siguiente. Entregar cada video reproducible para revisión y continuar con el siguiente tras su aprobación.

| Video | Dirección |
| --- | --- |
| Introducción | Aterrizaje de héroe con compresión, rebote, polvo y piedritas. La cámara orbita 360° alrededor del vehículo quieto. Al volver al tres cuartos, el escaneo sigue la carrocería y termina en el estudio limpio. |
| X-TREK | Camino rocoso en bosque de montaña. Cámara fija durante la prueba. Se lee el apoyo de la rueda, la articulación de la suspensión y el paso del eje trasero sobre la losa. |
| Vadeo | Río ancho. Cámara fija durante la prueba. La Tasman entra, cruza un tramo sostenido con ola de proa y estela, y sale por la otra orilla. |
| Storm | Carretera nocturna mojada. La cámara va de tres cuartos hacia lateral. La Tasman rueda por la recta bajo la lluvia y llega a la curva. Se reflejan faros y carrocería en el asfalto. |
| Carga en la paila | Patio exterior de un centro de distribución. La cámara va a tres cuartos trasero elevado. Las cajas toman forma y caen una por una dentro de la paila. |
| Remolque | Autopista en paisaje abierto. El remolque cargado toma forma detrás de la Tasman, con enganche visible. El conjunto se ve rodando en perfil lateral completo. |
| Interior | Tres cuartos frontal, perfil y entrada por la ventanilla lateral del conductor. El interior original se reconstruye durante el cruce. El arranque enciende el cuadro, el velocímetro, el tacómetro y la pantalla panorámica. Mostrar la carga inalámbrica y las asistencias previstas en el PDF con referencias reales. La cámara vuelve a salir por esa ventanilla. |

La presentación holográfica de Peter Weyland en *Prometheus* y las láminas de X-TREK y Vadeo guían el armado. En exteriores, la malla nace junto a las llantas y toma forma, textura y color de cerca hacia el fondo. Después de la acción, el entorno vuelve a malla y desaparece por capas, del fondo hacia la Tasman, mientras la cámara recupera el tres cuartos maestro.

Generar también clips cortos de transición entre poses vecinas en las dos direcciones que requiere el gesto. Verificar que cada clip conserve la carrocería, siga el giro previsto y empalme con el fotograma de la vista siguiente. Estos clips son auxiliares a los siete videos principales.

## 3. Integrar la experiencia web después de aprobar los siete videos

1. Conservar el flujo de la demo de cines. Entrada, caída y escaneo, estudio, y botón **Explorar las características**. Al abrirlo aparecen las seis pruebas. Al terminar cada video, reaparece el menú sobre el mismo encuadre del estudio.
2. En el estudio, deslizar horizontalmente reproduce un clip corto hacia la pose siguiente o anterior y se detiene en su fotograma de llegada. Al deslizar otra vez, el movimiento continúa desde esa vista. Los botones dan acceso directo a las cinco poses. La órbita completa de 360° forma parte del video de introducción.
3. Mostrar el fotograma maestro desde el arranque. Dar prioridad de carga a la introducción y solicitar las pruebas bajo demanda. Evitar cargar el iframe de PlayCanvas, el GLB y el motor WebGL en la ruta de video.
4. Verificar en un Android real desde el QR, con caché fría. Medir tiempo al primer fotograma visible, tiempo a la primera reproducción y bytes descargados antes de iniciar. Comparar contra la demo de cines con la misma conexión. Probar el gesto, los botones y el regreso al menú desde las seis pruebas.
