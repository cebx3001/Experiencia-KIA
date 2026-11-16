# Impacto háptico en móvil · histórico r5

**Cambio posterior r6:** el cliente solicita inicio automático. Se retira la espera del primer toque: la intro se reproduce sola, silenciada si el navegador lo requiere. El toque para activar sonido/vibración es opcional. Se conserva el sincronismo y el respaldo iOS de este documento.

Android/Chrome requiere activación del usuario para `navigator.vibrate()`. La intro anterior se reproducía silenciada y caía antes del primer toque; llamar a la API en ese estado no garantiza vibración. La corrección mantiene el video en su primer cuadro hasta tocarlo o activar sonido. Ese mismo gesto inicia sonido y caída. No se añade pantalla de acceso, botón Entrar ni controles al visor.

El contacto a 1,5 s dispara una sola solicitud `[90,35,40]`; el reloj del video, no un temporizador independiente, determina el instante. Pausa, salto, búsqueda y ocultación cancelan los pulsos. Se registra el booleano devuelto por la API. El hardware, los ajustes del teléfono y el navegador conservan la decisión final.

Safari/iPhone no implementa la API estándar Vibration. Se inspeccionó el código real de [WebHaptics](https://github.com/lochie/web-haptics), MIT, paquete npm 0.0.6, commit 7904ed1e1c92e093c1861091e4d809f7d00b7d0d. Su alternativa pulsa programáticamente un `input type=checkbox switch` nativo mediante una etiqueta oculta. Se incluye como respaldo **experimental** solo en iOS con soporte del atributo switch. No añade interfaz ni sonido de depuración. Licencia y hashes acompañan los dos módulos originales vendorizados.

El primer toque prepara la reproducción también en ese caso. Se prueba el flujo de eventos y la cancelación en navegador; no se dispone de un iPhone físico para confirmar la respuesta del Taptic Engine, ni se presenta la emulación como prueba de vibración real. No hay garantía universal del mismo patrón o intensidad que Android. Un wrapper nativo permitiría Core Haptics, pero no sería la experiencia web de GitHub Pages solicitada.
