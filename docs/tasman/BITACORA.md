# Bitácora de la experiencia de cine

Base funcional: `bfcb32e`, plan `PLAN-IMPLEMENTACION.md`. Autorización actual: completar automáticamente todas las fases; el antiguo estado EN VALIDACIÓN no es una puerta de aprobación intermedia.

## Fase 1 · Modelo, carga, caída e impacto

Se conservó la Tasman y su estudio. Se corrigió la reducción de definición (DPR hasta 0,6), se retiró el historial temporal que dejaba rastros al desplazar el vehículo, se preparan shaders antes de entrar y se mantiene completa la pasada primaria del producto. Auditoría y límites: `RENDER-AUDIT.md`.

La altura inicial se calcula proyectando las ocho esquinas del AABB completo: todas deben quedar por encima del borde superior con margen. No es una altura elegida sólo para ocultar el techo. La suspensión limita el recorrido a 24 cm y disipa la velocidad de contacto para evitar atravesar el suelo al aumentar la altura de caída; es una simulación artística, no un cálculo estructural.

Se implementaron negro/reflector, entrada por toque, sonido sintetizado, contacto único, polvo/piedras con profundidad, sacudida amortiguada y vibración cuando el navegador la permite. El salto cancela los efectos. La vista de laboratorio continúa separada. La prueba de flujo pasó el inicio fuera de cámara y la sincronización del contacto; la aceptación en equipo físico sigue pendiente.

## Fase 2 · Presentación y menú

Escaneo en 3D, nombre debajo del escenario, una única instancia PlayCanvas y cinco botones conforme a las láminas. La cámara gira alrededor del vehículo estático; el gesto cancela su giro automático. Las transiciones tienen cancelación para impedir respuestas atrasadas al pulsar varios botones.

## Fase 3 · Funciones

Agua ondulada hasta 0,8 m; seis cajas dentro del balde con prueba de profundidad; remolque y lanza; terreno facetado con carrocería inclinada y apoyos; entrada al tablero real con tres proyecciones y llamadas de los ADAS. Datos centralizados en `experiencia/config.js`. Pruebas: cinco accesos directos, datos geométricos, retorno, contador único e interrupciones; capturas en `evidence/`.

## Fase 4 · Cierre y publicación

Contador real, volver a explorar, Kia Ecuador y contacto configurable. El QR se generó y decodificó para la URL publicada de `/experiencia/`. La fuente Kia Signature oficial no está en los recursos recibidos: hay un punto de configuración y fallback sin solicitudes a archivos inexistentes. El destinatario de WhatsApp tampoco figura en el repo. La consulta a Kia Ecuador devolvió 403 desde el entorno: no se inventa ni se publica un número personal. El botón se mantiene identificado como pendiente de contacto, y se prueba la construcción del enlace con un destinatario ficticio de QA, sin enviar mensajes.

Texto comercial «hasta 1,2 t» conservado del brief. La guía señala una ficha local de 1.151 kg; requiere confirmación comercial de versión. No se afirma haber verificado esa fuente externa desde esta red.

La validación publicada y los commits finales se registran en la entrega y en `experiencia/release.json`. Safari/iPhone físico y Android físico se distinguen de las emulaciones disponibles; no se certifica una prueba que no se haya ejecutado.

### Ajustes tras la inspección de las cinco capturas

La primera ejecución completa pasó los controles, pero la inspección visual encontró encuadre de vadeo demasiado cerrado y proyecciones de tablero por detrás de la superficie real. Se amplió la toma lateral y se localizaron superficies del tablero mediante intersecciones con los triángulos decodificados: pantalla cerca de z=0,736 m y cargadores alrededor de y=0,956 m / z=0,65 m. Las proyecciones se colocan por delante de esas superficies; la cámara se sitúa en el lado del conductor.

Se corrigió además el pivote de la inclinación: el GLB tiene traslación importada (-1,1524; 0,0115; 2,5022) y escala 1,2052. Un rig exterior aplica la inclinación alrededor del origen del vehículo sin sobrescribir ese transform. Los apoyos se prueban también por encima del piso, no sólo por cercanía al terreno. Los recursos primitivos compartidos se destruyen mediante sus componentes, sin invalidar mallas de suelo/cajas compartidas.

La carga de campaña usa el progreso nativo de `Asset` de PlayCanvas; no realiza una segunda lectura del GLB mediante blob ni conserva una copia de descarga adicional. El porcentaje proviene de bytes reales cuando el servidor informa el total.

### Verificación final de encuadre y contacto

Se añadió regresión específica del caché de matrices de cámara de PlayCanvas: al salir de una vista interior, la proyección debía refrescar su matriz antes de calcular la altura. La prueba usa la cámara del motor fijado y AABB conservador; pasa dos repeticiones por tamaño (390×844, 360×740, 390×492 y 844×390). Es una prueba matemática, distinta de las capturas del GLB real. Resultados en `evidence/drop-framing-regression.json`.

La apertura del botón real de cierre se comprobó con un número ficticio, interceptando `wa.me` antes de salir a la red. Se restauró la configuración comercial nula al terminar. Registro: `evidence/whatsapp-navigation.json`. No se enviaron mensajes ni se incorporó un destinatario de QA a la entrega.

## Revisión 02 · Fluidez y acabado

Encargo `REVISION-02.md`, base `a2f4fd9`. Se implementa LOD móvil de la misma Tasman (832.267 triángulos, 15,3 MB, texturas originales intactas), reducción de pasadas en móvil, reloj de reproducción independiente del delta del motor, pista de suspensión precalculada y pausa por visibilidad. Agua y escaneo se resuelven en shaders; terreno estático, avance y apoyos independientes de ruedas; pool de impacto reutilizable sin aro; remolque utilitario, carga escalonada y relleno de tablero. Las llamadas DOM se mantienen estables y los meshes temporales se liberan al salir.

Prueba funcional inicial: `evidence/revision-02/campaign-verification.json`, recorrido completo aprobado en Chromium/SwiftShader emulado; controlador probado a 3 FPS en cuatro encuadres. La revisión visual lleva a suavizar el reflejo del agua y cerrar el terreno como volumen. Referencias, generación, licencias y límites en `REVISION-02-RESULTADOS.md`. No hay teléfono Android de Carlos ni iPhone físico conectado; se deja `?perf=1` para exportar métricas reales. La fuente oficial y el número de WhatsApp siguen pendientes como en la primera pasada.

Cierre de revisión: implementación `57581eb`, manifiesto `b056982`, con los ejes de las ruedas contrastados en el GLB, restauración de su posición local en cada muestra y llamadas adheridas al chasis. Se añadieron gráficos de carril/vehículo ADAS y carga inalámbrica sobre los elementos reales. Se examinaron clips de impacto, barrido y cinco funciones, además de sus imágenes nativas. Galería reproducible en `evidence/revision-02/index.html`. CI final y limitaciones de medición documentados en `REVISION-02-RESULTADOS.md`; no se certifican 30 FPS en Android ni Safari físico con este entorno.

## Revisión 03 · Realismo solicitado por el cliente

Se sustituyó la caída limitada artificialmente por estados de una simulación Rapier de masas suspendidas/no suspendidas, neumáticos, resortes y amortiguadores, con parámetros nominales y contacto único. Se mantienen el inicio fuera de cámara y la respuesta óptica en tiempo real. Las cajas colisionan con un balde conectado al mismo chasis y transmiten 900 kg de carga; no usan easing de caída.

Escaneo más ancho, reconstrucción acumulada y destellos sobre la superficie real; todo se retira al terminar. Agua Saint-Venant/HLL con caudal, conservación de masa y obstáculos, renderizada sin paredes de recipiente y con refracción/reflejos. El camino se forma antes de conducir, usa escaneo real de Paricutín y contactos de neumáticos derivados de los triángulos. El remolque se importa de CAD CC0 existente. Fuentes, límites físicos y recetas en `REVISION-03.md`; evidencias separadas de la revisión anterior.
