# Experiencia Kia Tasman · Especificación de implementación

**Revisión vigente:** [Fluidez y acabado tras la primera pasada](REVISION-02.md). Continúa desde la implementación actual y aplica sus prioridades y criterios de aceptación.

**Encargo para Codex.** Implementa y publica el recorrido completo de la guía del cliente en `cebx3001/Experiencia-KIA`. Ejecuta las fases en orden, comprueba cada una, corrige lo que falle y sigue automáticamente. Registra los resultados en el repositorio. Carlos revisará la experiencia completa al final.

## Base y referencias

- Esta rama parte de `feat/tasman-drop-phase1` en `2a646eeb8850b2e039f23c5a23e4171eec852825`. Incluye el visor PlayCanvas integrado y la caída existente. Antes de editar, revisa cambios más recientes y recupera lo reutilizable.
- Puntos de entrada a revisar: `studio/studio.js`, `studio/drop.js`, `studio/drop-preview.html`, `kia-playcanvas-renderer.js`, `index.html` y `app.js`. Reutiliza la escena, la Tasman 3D real, materiales, luces, poses, perfiles adaptativos y lógica de suspensión. La maqueta gráfica de `main` sirve como antecedente de interfaz.
- La guía del cliente tiene 15 páginas. Las páginas 3–14 corresponden a los pasos 1–12. Estas láminas reproducen las pantallas de referencia para que cada escena se pueda comparar con el PDF.

| Lámina | PDF | Contenido |
|---|---|---|
| [Pasos 01–04](references/tasman-01-04.jpg) | pp. 3–6 | QR, carga, caída, impacto |
| [Pasos 05–08](references/tasman-05-08.jpg) | pp. 7–10 | Escaneo, menú, vadeo, carga |
| [Pasos 09–12](references/tasman-09-12.jpg) | pp. 11–14 | Remolque, todoterreno, interior, cierre |

### Reglas de interfaz · PDF pp. 2 y 15

- Experiencia móvil vertical, prevista para 60–90 s. El QR abre la experiencia web directamente. Conserva la composición vertical al abrirla en una pantalla ancha.
- En el encabezado va solo el **logo oficial de Kia**. Usa **Kia Signature** con los archivos oficiales disponibles para la campaña. Si falta la fuente oficial, deja configurado el recurso esperado y registra ese pendiente de marca al cierre. El título **KIA TASMAN** aparece en Presentación, debajo de la camioneta y fuera del cuadro 3D. Retira el título superior grande, las pestañas de cámara/color/exterior/interior, las flechas del visor anterior, los textos superpuestos y las capas de navegación ajenas al PDF.
- La camioneta domina la pantalla. Cada ficha tiene un dato grande y una acción principal. El menú es la pantalla que contiene los cinco botones de selección. Conserva la flecha de regreso y el indicador de misión cuando aparecen en las fichas. Usa textos y controles de las láminas, con la misma jerarquía. Los chips y llamadas son información visual, sin acciones añadidas.
- Dibujo del vehículo en el PDF como guía de composición. En el sitio se ve el modelo 3D real. Los hologramas deben leerse como proyecciones sobre objetos reales: contorno cian, líneas internas, transparencia y brillo moderado. Ancla las llamadas a las piezas del vehículo. Usa mallas sencillas, planos, líneas y animaciones cortas, con oclusión donde corresponda. Conserva el estudio como escenario común.

## Fase 1 · QR, carga, caída e impacto · PDF pp. 3–6

1. **QR.** El QR de la butaca o de la pantalla del cine abre la URL publicada, en vertical y sin instalación. Valida el QR final con la URL publicada. «Simular escaneo» pertenece al mockup de la pieza física.
2. **Carga.** Logo, anillo de progreso de la camioneta 3D, texto de carga y **Entrar a la experiencia**. Usa progreso real cuando esté disponible y distingue la preparación del render. El toque inicia la intro y el audio. La Tasman y la primera toma deben estar listas antes de reproducir.
3. **Caída.** Arranca en negro, prende el reflector superior y deja caer la Tasman desde arriba con líneas de luz. Reutiliza la gravedad, la compresión y el rebote de la caída existente. La referencia marca 0,0 s negro, 0,6 s caída, 1,4 s impacto y 2,4 s de secuencia. Úsalos como referencia de ritmo. Incluye **Saltar intro**. Las tarjetas con tiempos de la lámina describen la secuencia.
4. **Impacto.** Marca el primer contacto de las llantas y úsalo para disparar el sonido, el polvo que sale hacia los lados, las piedritas, la sacudida breve y un pulso de vibración en navegadores compatibles. Haz que la cámara vuelva al encuadre estable. Implementa primero la escena en PlayCanvas. Si se usa el clip de Runway acordado como alternativa de acabado, mantén el 3D cargado y oculto antes de reproducirlo, iguala el plano de salida y sincroniza el pulso con el tiempo del video.

**Chequeos.** Carga en frío, QR correcto, botón de entrada, secuencia completa, salto antes del contacto y repetición de la prueba. Comprueba que compresión, polvo, piedras y sonido coincidan, y que el golpe se lea también en equipos sin vibración web. La vista de laboratorio con cámara lenta sigue disponible fuera del recorrido de campaña.

## Fase 2 · Presentación y menú · PDF pp. 7–8

5. **Presentación.** Una línea de luz recorre la Tasman ya estable. Usa el estado **Escaneando vehículo** de la lámina. Al terminar, muestra **KIA TASMAN** y la ficha corta debajo de la camioneta. **Ver features** abre el menú.
6. **Menú.** Camioneta bajo el reflector, con giro suave automático y **giro táctil libre de 360°**. El gesto toma el control de la órbita al empezar a arrastrar. Debajo, **¿Qué quieres explorar?** y la cuadrícula del PDF, con ícono, número y etiqueta.

| Fila | Izquierda | Derecha |
|---|---|---|
| 1 | 01 **Vadeo** | 02 **Carga** |
| 2 | 03 **Remolque** | 04 **Todoterreno** |
| 3 | 05 **Interior y tecnología**, a todo el ancho | |

**Chequeos.** Al terminar o saltar la intro se puede continuar a la presentación. El nombre queda debajo del escenario en todos los tamaños móviles. Los cinco botones son visibles y accionables. El giro recorre 360° con el dedo y cede a la cámara dirigida cuando se elige una función.

## Fase 3 · Cinco funciones · PDF pp. 9–13

Cada botón lleva desde el ángulo actual del menú hasta su encuadre guiado. Al salir de una función, retira su holograma y recupera el estado de escena correspondiente. En las misiones 01–04, **Siguiente** abre la próxima ficha del orden del PDF. En la 05, **Finalizar** lleva al cierre. La flecha de regreso devuelve al menú para elegir libremente. La numeración 01/05–05/05 y los puntos de progreso corresponden a la ficha activa.

| Paso / función | Cámara y acción holográfica | Dato y detalles de la lámina | Chequeo |
|---|---|---|---|
| 7 · **Vadeo** | Baja al costado. Con la Tasman estacionada, sube una superficie de agua ondulada con líneas translúcidas hasta la marca de **800 mm** medida desde el piso. Señala la toma de aire en el guardafango. | **800 mm**. A 7 km/h y toma de aire elevada, como en el PDF. | Se entiende el nivel de agua y la toma de aire. La camioneta queda quieta. |
| 8 · **Carga** | Desplázate suavemente al balde. Caen cajas de contorno cian y quedan apiladas dentro. Ancla rieles con ganchos y gradas laterales a sus piezas. | **1,2 toneladas** en el brief. Rieles ajustables y gradas laterales. | Las cajas entran dentro del balde, con oclusión en los bordes y sin atravesar la carrocería. |
| 9 · **Remolque** | Abre el plano hacia atrás. Dibuja el remolque de contorno y líneas cian, con su lanza conectada al enganche. | **3.500 kg**. Llamada al control integrado de freno del remolque. | Caben la Tasman y el remolque en vertical y se distingue el punto de unión. |
| 10 · **Todoterreno** | Baja al frente. Aparece terreno facetado holográfico y la Tasman se inclina brevemente sobre él con las ruedas visualmente apoyadas. | **X-TREK + Modo Roca**. Muestra 4WD 4L, e-LD y Ground View Monitor como en la lámina. Identifica Modo Roca para la versión X-Pro. | La inclinación, el terreno y los apoyos se entienden en un encuadre corto. |
| 11 · **Interior y tecnología** | Entra por el parabrisas y termina en la vista del conductor. Ilumina el panel panorámico, los dos cargadores inalámbricos y los asistentes con gráficos proyectados sobre el tablero. | **5 asistentes ADAS**. LFA 2, FCA 2, SCC, SVM 360° y BVM según el PDF. | Se leen las llamadas en móvil, se ve el tablero real y la cámara recupera el exterior al salir. |

El agua, las cajas, el remolque y el terreno se animan como elementos de demostración. Conserva el estilo de las láminas sin introducir conducción jugable, simulación de fluidos ni colisiones de props en el teléfono. Centraliza los datos de campaña. La web de Kia Ecuador dice «hasta 1,2 toneladas» y la ficha técnica local consultada indica 1.151 kg. Conserva la redacción del brief en el preview y registra la versión comercial pendiente de confirmación cuando corresponda. [Funciones de Kia Ecuador](https://www.kia.com/ec/showroom/Tasman0/features.html) · [Ficha técnica local](https://www.kia.com/content/dam/kwcms/ec/es/files/brochure/Fichas2026/Ficha_T%C3%A9cnica_Tasman_2026.pdf)

**Chequeos.** Prueba los cinco accesos directos, la secuencia con **Siguiente**, **Finalizar**, el regreso y la repetición de cualquier misión. Toca botones durante transiciones y comprueba que la cámara, los hologramas y el progreso quedan sincronizados. Registra cada misión completada una sola vez para el cierre.

## Fase 4 · Cierre, comprobación integral y publicación · PDF p. 14

12. **Cierre.** Vuelve a la Tasman bajo el reflector. Muestra el contador real de misiones completadas y **Ahora siéntela en el camino.** El botón verde **Agendar test drive** abre WhatsApp con mensaje preescrito. Debajo, conserva **Volver a explorar** y **Kia Ecuador** como en el mockup. Usa el destinatario oficial de la campaña si está disponible, o un WhatsApp oficial de ventas publicado por Kia Ecuador y documenta cuál se usó. Si falta un destino verificable, deja el enlace configurable, prueba la apertura con un destino de QA y registra el único dato que falta para publicar ese botón en campaña.

**Chequeos.** Prueba desde la URL publicada el flujo QR → carga → intro → escaneo → menú → las cinco fichas → cierre y vuelta a explorar. Comprueba Chrome Android y Safari iPhone, con viewport vertical, caché fría y red limitada. Identifica qué pruebas fueron físicas y cuáles emuladas. Revisa recortes, nitidez, tirones, 404 de assets, mensajes de consola, apertura de WhatsApp y continuidad de la cámara.

## Ejecución y cierre para Codex

Trabaja de forma autónoma hasta completar las cuatro fases. Al terminar cada fase, corre sus chequeos, arregla fallos y registra resultados y commit en la bitácora existente del repo. Continúa de inmediato con la siguiente. El estado histórico «EN VALIDACIÓN» de la caída registra la revisión anterior. La aprobación de Carlos ocurre al final del recorrido completo.

Usa una sola instancia PlayCanvas y perfila el flujo completo en móvil. Mantén acotados los emisores transparentes y detén los efectos fuera de su escena. Comprueba que el perfil móvil no descarga el modelo más pesado ni duplicados. Aísla la experiencia de campaña del visor de laboratorio. Haz commit, push y PR de la implementación. Publica una URL de preview navegable y verifica que sirva el SHA de entrega. Al final entrega URL, PR, commit, evidencias de las cuatro fases y cualquier dato externo que siga pendiente.
