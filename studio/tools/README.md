# Reconstrucción del entorno de estudio

El vehículo se renderiza en PlayCanvas. Blender/Cycles se utiliza únicamente para hornear un entorno HDR vacío con sus luminarias y suelo, sin el vehículo.

Desde la raíz del repositorio, con Blender 4.5 y Python con NumPy:

```sh
blender -b --python studio/tools/bake_studio_probe.py -- --config studio/assets/studio-lighting.json --output studio/assets/studio.hdr
python studio/tools/derive_indirect_sh.py --directory studio/assets
```

El segundo paso genera `studio/assets/studio-sh.json`. Copiar su campo `ambientSH` a `studio-lighting.json` si se cambia el diseño de luminarias. Se excluyen sus direcciones de la contribución difusa indirecta, manteniendo los reflejos del suelo y del entorno. La captura usa la convención de orientación de PlayCanvas y origen (0, 1, 0) m.

El horneado entregado usa 4096 × 2048, 64 muestras y emisores con perfil graduado. Los informes originales están en `assets/audit/studio-probe-bake.json` y `studio-indirect-sh.json`.
