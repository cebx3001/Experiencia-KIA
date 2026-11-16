# Entrega móvil · revisión 20261116-r4

Aplicación fuente: `experiencia-video/`. Publicación: `/experiencia/`. Las fuentes anteriores de PlayCanvas se conservan. La instrucción posterior del cliente autoriza terminar la integración y publicación sin revisiones intermedias.

- Entrada directa a la caída, sin pantalla de acceso ni botón de repetir intro. Caída desde fuera del cuadro recompuesta con el mismo vehículo aprobado: gravedad, contacto a 1,5 s, polvo y piedras angulares. No se generó otra intro de pago.
- El escaneo enlaza a los 19,5 s con el último fotograma codificado y la misma posición en pantalla. Aparece «Desliza para girar». La órbita usa 72 vistas extraídas de la intro aprobada, sin sustituirla por fotos de otra iluminación.
- Giro bidireccional continuo con mezcla de vistas, inercia, acercamientos y regreso animados; máximo 14 imágenes decodificadas. Menú con camioneta interactiva. No se descarga GLB ni se ejecuta WebGL.
- Controles de texto, sin cajas, bordes ni fondos. Kia Signature oficial, obtenida de la web de Kia, subconjuntos latinos de aproximadamente 34 KB por peso, con trazabilidad del origen.
- Siete videos de 20 s, 720×1280 y AAC 48 kHz. Las correcciones de Carga, Storm y X-TREK son nativas verticales. Los clips horizontales anteriores conservan su encuadre dentro del lienzo vertical. Una sola etiqueta video, pruebas bajo demanda y caché con versión r4.
- Carga corregida: una única paila trasera, compuerta cerrada, camioneta estacionada y cajas secuenciales. X-TREK: camino rocoso continuo y varios apoyos, aunque queda una cresta dominante. Storm: curva mojada con cambio de alineación y recuperación; función oficial **ESC (Control Electrónico de Estabilidad)**, no «modo lluvia». Fuentes y límites en `corrections/STORM-ESC.md` y revisiones visuales de cada escena.
- Vadeo: únicamente recolor local de partículas doradas a cian. Vehículo y agua conservados. El hash del flujo de audio original se mantiene idéntico.
- Sonido procedural original para montaje/desmontaje en las tres correcciones y para impacto/escaneo de intro; síntesis granular dirigida por los píxeles cian y eventos de contacto, sin librerías de efectos ni coste de API. Conserva ambiente nativo durante la acción. Integridad de los flujos de video verificada sin recompresión al mezclar audio.
- Audio de intro intenta reproducción automática; los navegadores que la bloquean reproducen silenciado y permiten activarlo tocando el video o «Activar sonido». No se introduce pantalla de acceso. Vibración sincronizada al contacto cuando el navegador la soporta; no disponible universalmente en iPhone.
- Final de cada clip vuelve al menú; conteo único tras terminar. Cierre al WhatsApp público de Kia Ecuador `593999157077`; no se envían mensajes automáticamente.

## Presupuesto

Total confirmado de recibos: **35,69841 USD de 45 USD**. Las tres correcciones solicitadas consumieron una única generación de **2,78307 USD cada una**. Saldo teórico restante: **9,30159 USD**. Sin reintentos automáticos ni más generaciones previstas. Edición, partículas de Vadeo, sonido, tipografía, visor y web son procesos locales sin coste de generación.

## Reproducibilidad y límites

Herramientas locales en `tools/tasman-preview/`: `rebuild_intro_drop.py`, `build_scan_spin.py`, `procedural_audio.py`, `recolor_vadeo.py`, `export_mobile.py`, `subset_brand_fonts.py`, `build_web.py`. Los originales, intentos anteriores y recibos permanecen separados. No volver a exportar las tres escenas sobre sus mezclas finales sin reaplicar el mezclador idempotente.

Las pruebas de navegador usan emulación móvil y escritorio; no certifican un Android o iPhone físico ni la respuesta de sus altavoces. Las escenas son ilustraciones publicitarias generadas: no prueban la física del vehículo ni implementan el controlador ESC real. Interior conserva las referencias reales de cabina, sin certificar cada detalle generado de pantallas y teléfonos. Las revisiones visuales documentan observaciones y límites; el éxito técnico no equivale a aprobación del cliente.
