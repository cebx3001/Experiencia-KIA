# Revisión 02 · Fluidez y acabado de la experiencia Tasman

## Encargo para Codex

Trabaja en `feat/tasman-experiencia-cines` sobre la primera pasada de `/experiencia/`. Usa el [plan original](PLAN-IMPLEMENTACION.md) y las referencias del PDF para la interfaz. Esta revisión actualiza la dirección visual del agua, el escaneo, el remolque y X-TREK. Conserva la navegación, el título debajo del escenario, el menú con giro táctil y los cinco accesos. Ejecuta todas las fases en orden, corrige los fallos que encuentres y continúa. Presenta el recorrido completo al final.

## 1. Recuperar fluidez en móvil

Carlos reporta aproximadamente 3 FPS y animaciones a saltos en su teléfono. La rama confirma PlayCanvas. La evidencia de la primera pasada corresponde a Chromium con SwiftShader y emulación táctil. Hay que medir el dispositivo real o registrar con precisión qué se pudo reproducir.

- Mide carga en frío por separado de la fluidez una vez cargada. Toma línea base en órbita, caída, escaneo y transiciones, además de agua y X-TREK. Registra perfil, dispositivo, navegador, resolución interna, intervalos de fotogramas p50/p95, pausas largas, tiempo CPU/GPU cuando se pueda medir y draw calls. Haz pruebas A/B aislando cada coste.
- El GLB móvil conserva **3.741.245 triángulos** y pesa **35,7 MB**. El perfil actual mantiene MSAA hasta 4×, SSAO, reflexión planar, color y profundidad de escena, y culling primario desactivado. La caída y X-TREK solicitan refrescar sombras en cada actualización. Son candidatos para medir. Prioriza quitar pasadas redundantes, adaptar sombras/reflejo/SSAO/MSAA y reactivar culling donde una regresión visual confirme que es seguro. Conserva la iluminación del estudio y la nitidez de la Tasman. Si el coste sigue en geometría, deriva un LOD exterior de la misma Tasman que conserve silueta, ruedas, pivotes y detalles visibles. Carga detalle interior de forma selectiva.
- En `studio/campaign-scene.js` y `studio/drop.js`, el avance se limita a **1/15 s por update**. A 3 FPS ese límite hace que el reloj de animación avance aproximadamente una quinta parte del tiempo real. Comprueba también el límite de delta del motor. Separa el reloj de la secuencia y la presentación del paso físico. Para la caída, usa una trayectoria calculada por la simulación y muestreada con el tiempo de reproducción, conservando un único marcador de impacto. Pausa y retoma limpiamente si la página queda oculta. Evita pasos de física acumulados sin límite.
- El agua reenvía vértices cada fotograma y X-TREK reconstruye mallas, aristas y normales incluso tras acabar el movimiento. Lleva las ondas al shader, deja el terreno estático y anima ruedas/chasis. Mantén nodos DOM estables para las llamadas en pantalla. Prepara shaders y recursos del impacto antes de iniciar la caída. Comprueba que no quede trabajo de efectos tras salir de una escena.

**Chequeo.** Compara antes/después en el mismo equipo, con un objetivo de 30 FPS sostenidos en el Android de referencia y cadencia estable. Verifica además que las tomas duren lo previsto con FPS bajos. Distingue las mediciones físicas de las pruebas con emulación. Si no tienes el teléfono de Carlos, deja un diagnóstico activable en la URL de revisión para capturar los datos de esa unidad.

## 2. Impacto y escaneo

- **Impacto.** Desde el punto de contacto de las llantas, dispara polvo denso al ras del piso que se abra a ambos lados y se disipe en el aire. Usa partículas suaves texturizadas con bordes irregulares, visibles contra el fondo oscuro, y piedritas con un arco corto que se lean a velocidad normal. Retira el círculo expansivo de la toma. Sincroniza golpe, compresión, sacudida y vibración compatible con el contacto. Si el polvo del motor no alcanza el acabado buscado, compón un pase prerenderizado que coincida con la misma toma, según el plan original.
- **Escaneo.** Sustituye el rectángulo y el aro de `scan()` por una línea de barrido que ilumine la **superficie real de la Tasman**. Haz que siga el relieve de las piezas visibles al pasar por ruedas, puertas, capó y techo, con una estela corta de puntos o líneas de digitalización. Usa la geometría y su profundidad para que el brillo respete contornos y oclusión, con coste acotado en móvil.
- **Chequeo.** Mira el impacto a velocidad normal y en cámara lenta. Se distingue polvo naciendo en las ruedas y al menos una piedrita. En el escaneo, la línea se lee pegada a la carrocería de principio a fin. Repite y salta la intro para comprobar cancelación y sincronía.

## 3. Acabado de las cinco funciones

| Función | Cambio | Chequeo visual |
|---|---|---|
| **Vadeo** | La Tasman sigue estacionada. Haz que se llene de agua alrededor hasta **800 mm** desde el piso. Dale volumen aparente y una superficie animada con ondulación, reflejos y una línea de agua que se encuentre con las ruedas y la carrocería. Conserva el tono de proyección con transparencia sutil. Usa un shader o un pase prerenderizado según coste. | Se ve agua llenando el espacio, con movimiento continuo, profundidad y contacto. La cuadrícula plana desaparece. |
| **Carga** | Conserva las cajas holográficas. Mejora bordes, material translúcido y el escalonamiento de la caída. Ajusta el encuadre y las llamadas para que se vea el balde. | Las cajas caen y se asientan dentro del balde, con escala y oclusión creíbles. |
| **Remolque** | Usa un modelo ligero o construye uno a partir de un **remolque real** de referencia. Saca sus contornos de esa geometría. Incluye lanza, enganche, chasis, guardabarros, ejes y ruedas de proporciones creíbles. | Se reconoce el remolque de inmediato y se ve cómo conecta con la Tasman. |
| **X-TREK** | Construye un tramo corto de **terreno rocoso realista**, con volumen y textura de piedra. La Tasman **avanza y asciende** en una toma guiada. Las ruedas giran, siguen el terreno y muestran recorrido de suspensión por eje/rueda. Ajusta el chasis a los apoyos y usa un encuadre bajo que muestre la articulación. Puedes precalcular la trayectoria y los apoyos para reproducirlos en PlayCanvas. La proyección cian puede acompañar la demostración sobre las rocas reales. | Se ve avance sobre piedras, contacto de neumáticos y compresión/extensión de suspensión. Revisa a velocidad normal y en cámara lenta que las ruedas no floten ni atraviesen las rocas. |
| **Interior** | Mejora nitidez, iluminación del tablero y encuadre. Proyecta gráficos alineados a pantalla, cargadores y ADAS. Coloca las etiquetas donde dejen visibles los detalles. | Las superficies se leen en móvil y los hologramas tienen profundidad y anclaje. |

Documenta en el repo la referencia y la licencia de cualquier asset de remolque, piedra o VFX incorporado. Deja reproducible la generación de cualquier animación o pase prerenderizado.

## 4. Verificación final

Prueba el recorrido publicado completo con el mismo QR, incluyendo giro táctil, los cinco accesos directos, Siguiente, regreso, Finalizar y la salida a WhatsApp según configuración. Comprueba tiempo de carga y cadencia con una sesión normal y otra prolongada. Entrega URL y PR verificados, SHA, comparación de tiempos antes/después y clips cortos de impacto, escaneo, vadeo, X-TREK y el resto de funciones. Reporta al final qué se comprobó en hardware real.
