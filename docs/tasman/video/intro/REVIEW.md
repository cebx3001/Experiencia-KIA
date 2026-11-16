# Introducción Tasman · Seedance 2.5

Estado de aprobación: **EN VALIDACIÓN**. La producción se limita a la introducción; no genera ninguna de las seis pruebas ni las transiciones. La integración del flujo web completo queda para después de las aprobaciones previstas en `docs/tasman/PLAN-VIDEO-UNREAL.md`.

Archivos de revisión: `intro.mp4` (H.264/AAC, 24 segundos, 1280×720, descarga progresiva), `master.png` (único maestro), `opening.png` y `validation.json`. La resolución es nativa de Seedance 2.5 según el catálogo comprobado, sin presentarla como 1080p. Se conserva `intro-source.mp4` antes de la transcodificación.

La vista de Kia Tan Beige TAM 45 es la base del maestro. Las otras siete vistas oficiales conservan la identidad durante el giro. La guía orbital monta las 72 imágenes originales de Kia empezando en la misma vista. La caída y el escaneo funcionales de Revisión 03 se adjuntan como guías de movimiento; la apariencia la fijan las imágenes oficiales y el maestro. Sus fuentes y hashes quedan registrados.

El prompt distribuye 24 segundos entre descenso/aterrizaje (0–3,2), órbita completa con vehículo estático (3,2–18,2), escaneo de superficie (18,2–22,5) y reposo (22,5–24). El primer fotograma es `opening.png` y el último es siempre el mismo `master.png`. Revisar proporciones, detalle de marca, contacto de neumáticos, peso, giro completo sin rotación del auto, reflejos y continuidad del cierre. Un video decodificable no implica aprobación visual.

## Ejecución

El workflow `.github/workflows/generate-tasman-intro.yml` ejecuta solo en `feat/tasman-experiencia-cines`, al cambiar sus archivos de producción o mediante **Run workflow**. Durante el paso de generación vincula exclusivamente `${{ secrets.OPEN_ROUTER_ACCESS }}` a la variable interna `OPENROUTER_API_KEY`. El nombre exacto lo confirmó el cliente; no se enumeran otros secretos. El secreto no se guarda en archivos, navegador, recibos ni URLs públicas. Si está guardado en un Environment de Actions, el job debe vincular ese Environment por su nombre exacto; si es secreto del repositorio, no requiere Environment.

Se usa la API oficial asíncrona: `GET /api/v1/videos/models`, `POST /api/v1/videos`, `GET /api/v1/videos/{id}` y `GET /api/v1/videos/{id}/content`. Documentación contrastada con https://github.com/OpenRouterTeam/docs/blob/main/api_reference/videos.mdx y el SDK oficial. No se usa `/chat/completions` para inventar una API de video.

Solo se hace un envío de pago. Un reintento con recibo continúa el mismo trabajo; con entrega completa no genera nada; con envío ambiguo sin recibo se detiene para evitar un doble cargo. Los parámetros y hashes permiten repetir el proceso, pero una semilla no garantiza resultados idénticos entre versiones del proveedor. Actions conserva los entregables como artefacto y en esta rama; una generación terminada se adjunta también a una prerelease de revisión.

Si Actions informa un secreto vacío, no se envía ningún trabajo de pago. No hace falta compartir el valor en el chat: corregir su disponibilidad en Actions y volver a ejecutar el workflow.

Diagnóstico del acceso: GitHub denegó el listado de nombres por su API de metadatos con `403: Resource not accessible by integration` (ver `secret-metadata.json`). Los alias comprobados devolvieron vacío. El intento anterior de inspeccionar el contexto completo fue rechazado por el control automático de GitHub y se retiró; no se ha ejecutado ni se necesita aprobarlo. Para configurar un nombre diferente hace falta copiar su nombre exacto desde Settings → Secrets and variables → Actions, nunca su valor.

Configuración resuelta: el cliente confirmó el secreto de repositorio `OPEN_ROUTER_ACCESS`. Se retiraron las comprobaciones de alias y el diagnóstico de nombres; el workflow usa ese único secreto.
