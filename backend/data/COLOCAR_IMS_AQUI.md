# Coloca aquí el dataset IMS

Descarga el **IMS Bearing Dataset** de NASA y descomprímelo en esta carpeta
con la siguiente estructura:

```
backend/data/IMS/
├── 1st_test/
│   ├── 2003.10.22.12.06.24
│   ├── 2003.10.22.12.16.24
│   └── ... (archivos sin extensión, tab-separated)
├── 2nd_test/
│   └── ...
└── 3rd_test/
    └── ...
```

## Notas importantes

- Los archivos **NO tienen extensión** (su nombre es la fecha/hora de captura).
- **1st_test**: 8 columnas (2 sensores por rodamiento).
- **2nd_test** y **3rd_test**: 4 columnas (1 sensor por rodamiento).
- El RUL real se calcula automáticamente: el último archivo de cada carpeta
  marca el momento de falla.

## Ejecutar el procesamiento

```bash
cd backend
python procesar_datos.py
```

Si tu dataset está en otra ruta, usa la variable de entorno:

```bash
# Windows (PowerShell)
$env:IMS_PATH="C:\ruta\a\IMS"; python procesar_datos.py

# Linux / Mac
IMS_PATH=/ruta/a/IMS python procesar_datos.py
```
