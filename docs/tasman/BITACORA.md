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
