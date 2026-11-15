# Experiencia KIA Tasman · Producción de video y navegación en móvil

El estudio existente en Unreal es la fuente de la Tasman color arena, su cabina, la iluminación y las poses de cámara. La demo de PlayCanvas y sus capturas sirven como referencia de acción, ritmo y encuadre. La entrega web se plantea con video y fotogramas prerenderizados de forma que el teléfono reproduzca la experiencia sin descargar la malla GLB ni abrir el estudio WebGL.

## 1. Preparar las referencias

1. Exportar de Unreal el tres cuartos frontal limpio, la órbita completa de 360° y referencias de la Tasman cada 45°. Incluir detalles de carrocería, ruedas, paila y cabina. Guardar las vistas tres cuartos frontal, frontal, lateral, trasera y tres cuartos superior y sus transiciones de cámara.
2. Usar las láminas aprobadas para la dirección artística y los estados de armado de cada entorno. Usar las [capturas de Revisión 03](evidence/revision-03/index.html) para la caída y el escaneo, y los [clips de Revisión 02](evidence/revision-02/index.html) para las acciones de las cinco pruebas originales. Storm parte de su lámina aprobada. Las guías de Blender ya preparadas sirven para revisar el movimiento y comparar contra el render de Unreal.
3. Usar el mismo tres cuartos maestro como fotograma de entrada y salida de cada video y como toma central de la página. En los movimientos auxiliares, fijar los extremos a los fotogramas exactos de sus poses.

## 2. Producir y revisar siete videos

Generar mediante OpenRouter. Runway es la primera opción para el piloto de continuidad. Seedance, MiniMax u otro modelo son alternativas según el tipo de referencia que acepte y su resultado. Usar las referencias de Unreal para fijar geometría, pintura, luz y cámara. Si el modelo admite video guía, usar el recorrido exportado. Usar los fotogramas individuales según la modalidad disponible. Conservar la exportación de Unreal para una toma si es la mejor versión de su movimiento.

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

## 3. Integrar la experiencia web después de aprobar los siete videos

1. Conservar el flujo de la demo de cines. Entrada, caída y escaneo, estudio, y botón **Explorar las características**. Al abrirlo aparecen las seis pruebas. Al terminar cada video, reaparece el menú sobre el mismo encuadre del estudio.
2. Usar las cinco poses prerenderizadas para explorar el vehículo. Probar primero que un deslizamiento horizontal cambie a la vista siguiente o anterior usando el clip de transición. Así se puede responder al gesto que pidió el cliente antes de decidir si basta con deslizar entre poses o necesita giro continuo. Los botones de cámara dan acceso directo a cada vista. Mantener la órbita completa de 360° en la intro.
3. Mostrar el fotograma maestro desde el arranque. Dar prioridad de carga a la introducción y solicitar las pruebas bajo demanda. Evitar cargar el iframe de PlayCanvas, el GLB y el motor WebGL en la ruta de video.
4. Verificar en un Android real desde el QR, con caché fría. Medir tiempo al primer fotograma visible, tiempo a la primera reproducción y bytes descargados antes de iniciar. Comparar contra la demo de cines con la misma conexión. Probar el gesto, los botones y el regreso al menú desde las seis pruebas.
