# Nitidez y continuidad del modelo · 13 noviembre 2026

## Hallazgos reproducidos

1. El perfil anterior limitaba móviles a DPR 1 y podía seguir bajando hasta **0,6**. Un escenario de 390 px podía acabar renderizado a 234 px de ancho. El descenso era irreversible durante la sesión. Ésta es una causa comprobada de borrosidad, independiente de la calidad del GLB.
2. TAA reutiliza información temporal. La exportación y las transiciones de un vehículo que se mueve respecto a cámara mostraban restos de poses anteriores; no equivalen a piezas eliminadas del GLB. Se sustituyó por MSAA, sin historial de imagen, y se mantuvo resolución nativa como mínimo. No se aumenta el color ni se sustituye el material para ocultar el problema.
3. La carga anterior declaraba `ready` al terminar la importación, antes del primer fotograma del vehículo. Ahora hay preparación separada de shaders y cuatro fotogramas; no se permite entrar mientras un programa usado siga pendiente. La pérdida/restauración del contexto vuelve a mostrar la preparación, en lugar de enseñar una restauración parcial.
4. Se auditó la geometría Draco decodificada: 3.741.245 triángulos. La comprobación de centroides/áreas en coordenadas mundiales no encontró coincidencias entre primitivas distintas a su tolerancia (10 µm para centroides, 1e-8 m² para área). No es una prueba exhaustiva de proximidad de todas las superficies, pero no apoya eliminar piezas como supuesto remedio.
5. Las pruebas A/B de desactivar sombras o máscaras no justificaron eliminar esas capacidades. Se conservan las máscaras y sus umbrales. La cámara primaria mantiene el producto completo sin recorte por instancias; las cámaras de sombra/reflexión conservan su culling. El clipping exterior pasa de 0,025–100 m a 0,12–60 m, y el interior conserva 0,025 m.

## Corrección

- DPR inicial hasta 1,5 en móvil/intermedio; mínimo adaptativo `min(DPR del dispositivo, 1,25)`. Nunca se reduce por debajo de un píxel por píxel CSS. La adaptación prioriza muestras/escala de SSAO y usa tiempos reales de fotogramas e histéresis.
- MSAA hasta cuatro muestras; TAA desactivado. Esto evita acumulación de poses y cortes de cámara. Los reflejos, el barniz, la transmisión y las luminarias originales siguen activos.
- Perfil móvil `kia-tasman-mobile-sharp.glb`: 35.712.304 bytes frente a 32.116.960 del anterior; no descarga el modelo de 83.633.164 bytes. Sólo se suben a 2K los dos mapas con máscara de corte y los normales de pintura, barniz y neumático. El resto mantiene el presupuesto móvil. La geometría Draco y los parámetros de materiales se comparan byte a byte / semánticamente durante la generación. No hay LOD ni partes suprimidas.
- Anisotropía hasta 4, un solo trabajador Draco en el perfil móvil, y progreso de descarga medido en bytes. La preparación del render se muestra como una fase distinta del 100 % de descarga.

El perfil suma unos 224 MiB estimados de mapas del vehículo con mipmaps; los recursos del estudio y buffers agregan memoria adicional. La cifra real depende del viewport. No se declara una tasa universal de FPS ni se confunden capturas SwiftShader con pruebas de GPU física.

## Evidencias y límites

`evidence/render-before.png` y `evidence/render-native-msaa.png` son renders reales a los presupuestos respectivos; tienen distinta resolución de salida y no son una comparación perceptual normalizada. `evidence/campaign-verification.json` registra shaders preparados, errores GL, perfil solicitado y el recorrido. La geometría, máscaras y fuentes de luz originales permanecen disponibles en el repositorio.

Las pruebas se ejecutan en Chromium de Linux con SwiftShader y emulación táctil. Falta aceptación en teléfonos Android/iPhone físicos. WebKit/Safari no se presenta como probado si no se dispone de su ejecutable. Los cambios de presupuesto son conservadores; la resolución superior tiene un coste de GPU que debe contrastarse con hardware real.

La campaña conserva un tamaño de viewport 3D estable entre sus pantallas: cambiar intro/menú/ficha/cierre ya no redimensiona el canvas ni vuelve a reservar sus framebuffers. Esto evita fotogramas borrados durante los cambios de composición. El recorte exterior y los controles se componen por encima del mismo escenario; sólo un cambio real de tamaño/orientación redimensiona el render.
