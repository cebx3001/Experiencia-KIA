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
