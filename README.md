# RUL Prediction SaaS — IMS Bearing Dataset (NASA)

Aplicación web para estimar la vida útil restante (RUL, *Remaining Useful Life*)
de rodamientos industriales a partir de señales de vibración. El modelo combina
Análisis de Componentes Principales (PCA) con una red neuronal, y se valida sobre
el IMS Bearing Dataset de la NASA. La interfaz incluye un panel de indicadores de
confiabilidad (MTBF, MTTF, MTTR, disponibilidad y confiabilidad).

Proyecto del curso de Álgebra Lineal Aplicada — Universidad del Pacífico, 2026-I.

Este es un prototipo académico cuyo objetivo es demostrar el pipeline completo
(procesamiento de señales, álgebra lineal y aprendizaje automático) sobre datos
reales. No es un sistema de producción.

## Qué problema resuelve

En mantenimiento predictivo se busca anticipar cuándo va a fallar un componente
para intervenir antes de que ocurra, en lugar de esperar a la avería o de cambiar
piezas que aún sirven. El proyecto estima, a partir de la vibración medida, cuánta
vida le queda a cada rodamiento.

## Qué es el dataset IMS

El IMS Bearing Dataset contiene tres experimentos *run-to-failure*: rodamientos
puestos a funcionar de forma continua hasta que fallan, registrando su vibración
con acelerómetros cada diez minutos. El dataset entrega únicamente las señales de
vibración crudas; no incluye una etiqueta de "vida restante".

Los tres experimentos tienen características distintas:

- 1er ensayo: 4 rodamientos con 2 sensores cada uno (2 canales por rodamiento),
  con una duración aproximada de 34 días.
- 2do ensayo: 4 rodamientos con 1 sensor cada uno, aproximadamente 7 días.
- 3er ensayo: 4 rodamientos con 1 sensor cada uno, aproximadamente 31 días.

En total son 12 rodamientos. Un "canal" es la señal de un sensor en una dirección;
por eso el primer ensayo, con dos sensores por rodamiento, aporta dos canales por
rodamiento.

## De dónde sale el RUL real

Como cada experimento corre hasta la falla, se toma el último registro de cada
rodamiento como el instante de la avería (RUL igual a cero). Para cualquier
registro anterior, el RUL real es el tiempo que falta hasta ese último registro:

```
RUL_real(registro) = fecha_del_ultimo_registro − fecha_del_registro
```

Esta es una convención estándar para datos *run-to-failure*. El RUL real no es un
dato medido por el sensor, sino una etiqueta construida a partir de las fechas.

## Cómo funciona el modelo

El procesamiento sigue estas etapas:

1. Extracción de características. Cada señal de vibración (miles de muestras) se
   resume en 13 características: nueve temporales (RMS, pico, desviación estándar,
   curtosis, factor de cresta, asimetría, pico a pico, factor de forma y factor de
   impulso) y cuatro espectrales obtenidas con la Transformada Rápida de Fourier
   (energía en banda alta, centroide espectral, curtosis espectral y proporción de
   energía en frecuencias medias-altas). Las características espectrales importan
   porque los defectos de un rodamiento generan energía en frecuencias altas.

2. Normalización por estado sano. Las características de cada rodamiento se dividen
   por su valor de referencia al inicio de la vida (cuando está sano). Así, todos
   los rodamientos arrancan alrededor de 1.0 y se vuelven comparables entre sí, a
   pesar de que cada uno vibre a un nivel distinto por su montaje o su sensor.

3. Tendencia. A cada característica suavizada se le añade su pendiente, que captura
   cómo evoluciona la vibración en el tiempo. Esto lleva el vector a 26
   características por muestra.

4. Reducción de dimensión con PCA. Se construye la matriz de covarianza de las
   características, se obtienen sus valores y vectores propios, y se conservan las
   componentes que explican el 95 % de la varianza. Cada muestra se proyecta sobre
   esas componentes principales.

5. Red neuronal. Una red densa con salida sigmoide recibe las componentes de PCA y
   predice la salud restante, un valor entre 0 (falla) y 1 (sano).

El objetivo que aprende la red es la salud restante con RUL *piecewise*: la vida se
considera sana (valor 1) hasta un punto de la trayectoria y, a partir de ahí, decae
linealmente hasta 0. Esta formulación es habitual en prognosis porque evita pedirle
a la red que distinga entre estados sanos que producen señales casi idénticas.

## Cómo se valida

La validación usa un split estratificado 80/20 por rodamiento: de cada rodamiento,
el 80 % de las muestras se usa para entrenar y el 20 % para validar. De este modo
cada rodamiento está representado en ambos conjuntos, y las métricas miden si el
modelo aprendió la relación entre la vibración y la vida restante.

Conviene tener presente el alcance de este esquema. Mide la capacidad del modelo
para capturar el patrón de degradación, no su capacidad de predecir un rodamiento
completamente nuevo nunca visto, que es un escenario más exigente y difícil de
abordar con solo 12 rodamientos provenientes de tres experimentos heterogéneos.

## Métricas

El modelo reporta sobre el conjunto de validación:

- R²: proporción de varianza explicada.
- RMSE: raíz del error cuadrático medio, en días.
- MAE: error absoluto medio, en días.

Los artefactos del modelo entrenado quedan en `backend/modelo/`: la red
(`modelo_rul.keras`), el normalizador (`scaler.pkl`), la proyección PCA (`pca.pkl`)
y las métricas (`metricas.json`).

## Estructura del proyecto

```
rul-saas/
  backend/
    main.py             API REST (FastAPI) y modelos de base de datos
    procesar_datos.py   Lectura del IMS, extracción de características y carga a BD
    modelo_rul.py       Entrenamiento, validación y predicción de la red
    indicadores.py      Cálculo de indicadores de confiabilidad (MTBF, MTTF, etc.)
    requirements.txt    Dependencias de Python
    data/               Carpeta donde se coloca el dataset IMS
  frontend/
    src/
      pages/            Vistas: panel, rodamientos, predicciones, indicadores, alertas
      components/       Componentes compartidos (layout, navegación)
      lib/              Cliente de la API
    package.json        Dependencias de Node
```

## Requisitos

- Python 3.10 o superior
- Node.js 18 o superior
- El IMS Bearing Dataset, colocado en `backend/data/` (ver
  `backend/data/COLOCAR_IMS_AQUI.md`)

## Cómo ejecutar

El backend procesa los datos, entrena el modelo y expone la API. El frontend
consume esa API. Se ejecutan por separado.

Backend:

```
cd backend
pip install -r requirements.txt
python procesar_datos.py     # procesa el IMS y entrena el modelo (primera vez)
python main.py               # inicia la API en http://localhost:8000
```

La variable de entorno `PASO_LECTURA` controla cuántos archivos se leen: con valor
1 se procesan todos (más preciso, más lento); con un valor mayor se lee 1 de cada N
(más rápido, para pruebas).

Frontend:

```
cd frontend
npm install
npm run dev                  # interfaz en http://localhost:3000
```

## Notas sobre los datos mostrados

Todos los valores de vibración y las predicciones que muestra la interfaz provienen
del modelo y de las señales reales del IMS. El RUL real se construye con la
convención *run-to-failure* descrita arriba.
