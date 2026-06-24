"""
Procesador de datos IMS Bearing Dataset (NASA) + Red Neuronal
- Lee archivos sin extensión (formato 2003.11.25.10.57.32)
- Extrae features estadísticas de cada señal de vibración
- Entrena una red neuronal (validación leave-bearings-out) para predecir RUL
- Calcula RUL Real a partir de las fechas de los archivos
"""

import os
import sys
import re
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from main import SessionLocal, Rodamiento, Medicion, Prediccion, Alerta

# ----------------------------------------------------------------------------
# CONFIGURACIÓN
# ----------------------------------------------------------------------------

MUESTRA_POR_RODAMIENTO = 100   # puntos a guardar en la BD para visualización

# Para acelerar: leer 1 de cada N archivos del disco. La degradación es gradual,
# así que muestrear no pierde información relevante y reduce el tiempo de ~40 min
# a unos pocos minutos. Ajustable con la variable de entorno PASO_LECTURA.
#   PASO_LECTURA=1  -> lee TODOS los archivos (máxima fidelidad, más lento)
#   PASO_LECTURA=5  -> lee 1 de cada 5 (recomendado, rápido)
PASO_LECTURA = int(os.environ.get("PASO_LECTURA", "5"))

IMS_PATH = os.environ.get("IMS_PATH", "./data/IMS")

# Estructura de canales por test (el IMS cambia entre experimentos)
#   1st_test: 8 canales (2 por rodamiento) -> Bearing i usa columnas 2i-2, 2i-1
#   2nd_test: 4 canales (1 por rodamiento) -> Bearing i usa columna i-1
#   3rd_test: 4 canales (1 por rodamiento) -> Bearing i usa columna i-1
TEST_CONFIG = {
    "1st_test": {"n_bearings": 4, "cols_per_bearing": 2},
    "2nd_test": {"n_bearings": 4, "cols_per_bearing": 1},
    "3rd_test": {"n_bearings": 4, "cols_per_bearing": 1},
}


# ----------------------------------------------------------------------------
# UTILIDADES
# ----------------------------------------------------------------------------

def extraer_fecha_archivo(nombre):
    """
    Extrae fecha de un nombre tipo 2003.11.25.10.57.32
    Devuelve datetime o None si no matchea.
    """
    m = re.match(r"^(\d{4})\.(\d{2})\.(\d{2})\.(\d{2})\.(\d{2})\.(\d{2})$", nombre)
    if not m:
        return None
    y, mo, d, h, mi, s = map(int, m.groups())
    try:
        return datetime(y, mo, d, h, mi, s)
    except ValueError:
        return None


def listar_archivos_ims(carpeta):
    """
    Lista archivos IMS (sin extensión) ordenados cronológicamente por su nombre.
    """
    p = Path(carpeta)
    if not p.exists():
        return []
    archivos = []
    for f in p.iterdir():
        if f.is_file() and extraer_fecha_archivo(f.name) is not None:
            archivos.append(f)
    archivos.sort(key=lambda f: extraer_fecha_archivo(f.name))
    return archivos


def leer_archivo_ims(filepath):
    """
    Lee un archivo IMS. Formato: columnas separadas por tabulación, sin header.
    Devuelve un np.ndarray (n_muestras, n_canales) o None si falla.
    """
    try:
        df = pd.read_csv(filepath, sep="\t", header=None, engine="python")
        if df.shape[1] == 1:
            df = pd.read_csv(filepath, sep=r"\s+", header=None, engine="python")
        if df.empty:
            return None
        return df.values.astype(float)
    except Exception as e:
        print(f" [!]  No se pudo leer {filepath.name}: {e}")
        return None


def features_de_senal(col):
    """
    Extrae 13 features de una señal 1D de vibración:
      Temporales (9): rms, pico, std, kurtosis, factor cresta, asimetría,
                      pico-a-pico, factor de forma, factor de impulso.
      Espectrales (4) vía FFT: energía en banda alta (defectos), centroide
                      espectral, kurtosis espectral, ratio de energía media-alta.
    Las features espectrales son clave: los defectos de rodamiento (inner/outer
    race, rodillos) generan energía en frecuencias características.
    """
    col = np.asarray(col, dtype=float)
    n = len(col)
    abs_col = np.abs(col)
    mean_abs = float(np.mean(abs_col)) + 1e-12

    rms = float(np.sqrt(np.mean(col**2))) + 1e-12
    peak = float(np.max(abs_col))
    std = float(np.std(col))
    kurt = float(pd.Series(col).kurtosis()) if n > 3 else 0.0
    skew = float(pd.Series(col).skew()) if n > 2 else 0.0
    crest = peak / rms
    p2p = float(np.max(col) - np.min(col))
    shape = rms / mean_abs
    impulse = peak / mean_abs

    # --- Dominio de frecuencia (FFT) ---
    fft_mag = np.abs(np.fft.rfft(col * np.hanning(n)))
    fft_mag = fft_mag + 1e-12
    freqs = np.fft.rfftfreq(n)
    e_total = float(np.sum(fft_mag**2))
    # banda alta = mitad superior del espectro (donde aparecen los defectos)
    mitad = len(fft_mag) // 2
    e_high = float(np.sum(fft_mag[mitad:]**2))
    e_high_ratio = e_high / (e_total + 1e-12)
    centroid = float(np.sum(freqs * fft_mag) / np.sum(fft_mag))
    spec_kurt = float(pd.Series(fft_mag).kurtosis()) if len(fft_mag) > 3 else 0.0
    # ratio energía banda media-alta (cuarto superior) sobre total
    q3 = (3 * len(fft_mag)) // 4
    e_midhigh = float(np.sum(fft_mag[q3:]**2)) / (e_total + 1e-12)

    return [rms, peak, std, kurt, crest, skew, p2p, shape, impulse,
            e_high_ratio, centroid, spec_kurt, e_midhigh]


N_FEATURES_BASE = 13
ROLLING_WIN = 5   # ventana para suavizado y cálculo de tendencia


# ----------------------------------------------------------------------------
# PROCESAMIENTO POR RODAMIENTO
# ----------------------------------------------------------------------------

def _features_por_canal(archivos, cols):
    """
    Extrae features de CADA canal por separado (no combina en magnitud, lo que
    destruía señal). Devuelve {col_idx: (matriz (n,13), fechas)}.
    """
    archivos_m = archivos[::PASO_LECTURA] if PASO_LECTURA > 1 else archivos
    por_canal = {c: ([], []) for c in cols}
    for f in archivos_m:
        data = leer_archivo_ims(f)
        if data is None:
            continue
        fch = extraer_fecha_archivo(f.name)
        for c in cols:
            if c < data.shape[1]:
                feats, fechas = por_canal[c]
                feats.append(features_de_senal(data[:, c]))
                fechas.append(fch)
    salida = {}
    for c, (feats, fechas) in por_canal.items():
        if feats:
            salida[c] = (np.array(feats), fechas)
    return salida


def _normalizar_y_tendencia(feats_raw):
    """
    Convierte features crudas en features comparables ENTRE rodamientos:
      1. Normaliza por el baseline sano (mediana de las primeras mediciones),
         de modo que todo rodamiento arranca en ~1.0 → escalas comparables.
      2. Suaviza con media móvil (reduce ruido).
      3. Añade la pendiente (tendencia) de cada feature → capta la degradación.
    Devuelve matriz (n, 26): [features_suavizadas (13), pendientes (13)].
    """
    n = len(feats_raw)
    n_base = max(5, n // 10)                       # primeras ~10% = estado sano
    baseline = np.median(feats_raw[:n_base], axis=0)
    baseline = np.where(np.abs(baseline) < 1e-9, 1e-9, baseline)
    feats_norm = feats_raw / baseline              # ~1.0 en estado sano

    # Suavizado por media móvil
    df = pd.DataFrame(feats_norm)
    suav = df.rolling(ROLLING_WIN, min_periods=1).mean().values

    # Pendiente (tendencia) sobre la señal suavizada
    slope = np.zeros_like(suav)
    for i in range(n):
        a = max(0, i - ROLLING_WIN)
        slope[i] = (suav[i] - suav[a]) / max(1, i - a)

    return np.hstack([suav, slope])                # (n, 26)


def extraer_datos_rodamiento(test_name, bearing_idx, carpeta):
    """
    FASE 1 — Extrae features procesadas y la fracción de vida restante de un
    rodamiento. Cada canal aporta su propia serie de muestras (con el mismo
    objetivo de RUL), lo que multiplica los datos y unifica la dimensión.
    """
    cfg = TEST_CONFIG[test_name]
    cpb = cfg["cols_per_bearing"]
    cols = list(range((bearing_idx - 1) * cpb, bearing_idx * cpb))
    nombre = f"{test_name}_Bearing{bearing_idx}"

    print(f"\n {nombre}  (canales {cols})")

    archivos = listar_archivos_ims(carpeta)
    if not archivos:
        print(f" [!]  Sin archivos válidos en {carpeta}")
        return None

    fecha_inicio = extraer_fecha_archivo(archivos[0].name)
    fecha_falla = extraer_fecha_archivo(archivos[-1].name)
    vida_total_h = (fecha_falla - fecha_inicio).total_seconds() / 3600.0
    vida_total_dias = vida_total_h / 24.0
    print(f" {len(archivos)} archivos | inicio {fecha_inicio.date()} → falla {fecha_falla.date()} "
          f"({vida_total_dias:.1f} días)")

    por_canal = _features_por_canal(archivos, cols)
    if not por_canal:
        print(" [X] No se pudieron extraer features")
        return None

    # Procesar cada canal: normalizar + tendencia + fracción de vida restante
    X_list, frac_list = [], []
    serie_dashboard = None        # guardamos un canal para las gráficas
    for c, (feats_raw, fechas) in por_canal.items():
        Xc = _normalizar_y_tendencia(feats_raw)
        frac_restante = np.array([
            (fecha_falla - fch).total_seconds() / max(vida_total_h * 3600.0, 1e-6)
            for fch in fechas
        ])
        frac_restante = np.clip(frac_restante, 0.0, 1.0)
        X_list.append(Xc)
        frac_list.append(frac_restante)
        if serie_dashboard is None:
            serie_dashboard = {"X": Xc, "fechas": fechas,
                               "feats_raw": feats_raw, "frac": frac_restante}

    X = np.vstack(X_list)
    frac = np.concatenate(frac_list)

    print(f" [OK] {len(X)} muestras ({len(por_canal)} canal/es) | "
          f"features {X.shape[1]}D | vida restante 1.00→0.00")

    return {
        "nombre": nombre,
        "test": test_name,
        "cols": cols,
        "X": X,                          # features procesadas (N, 26)
        "frac": frac,                    # fracción de vida restante lineal [0,1]
        "vida_total_dias": round(vida_total_dias, 1),
        "fecha_inicio": fecha_inicio,
        "fecha_falla": fecha_falla,
        "n_archivos": len(archivos),
        "dashboard": serie_dashboard,    # serie de un canal para las gráficas
    }


def poblar_bd_rodamiento(datos, db, frac_actual=1.0):
    """
    FASE 3 — Usa la red neuronal YA entrenada para predecir la salud restante
    del rodamiento y guarda mediciones, predicciones y alertas en la BD.
    `frac_actual` ∈ (0,1]: fracción de vida YA transcurrida en el momento "ahora"
    (para simular una flota con rodamientos en distintos puntos de su vida).
    """
    import modelo_rul

    nombre = datos["nombre"]
    test_name = datos["test"]
    vida = datos["vida_total_dias"]
    serie = datos["dashboard"]
    Xs_full = serie["X"]                 # features procesadas del canal (n, 26)
    fechas_full = serie["fechas"]
    feats_raw_full = serie["feats_raw"]  # features crudas (n, 13)
    frac_lin_full = serie["frac"]        # fracción de vida restante real [0,1]

    # Recortar la trayectoria hasta el "momento actual" (vida transcurrida = frac_actual)
    transcurrida = 1.0 - frac_lin_full
    idx_actual = int(np.argmin(np.abs(transcurrida - frac_actual)))
    idx_actual = max(5, idx_actual)      # asegurar algo de historia
    sl = slice(0, idx_actual + 1)
    Xs = Xs_full[sl]
    fechas = fechas_full[sl]
    feats_raw = feats_raw_full[sl]
    frac_lin = frac_lin_full[sl]

    # --- PREDICCIÓN REAL con la red neuronal (salud restante piecewise) ---
    salud_pred = modelo_rul.predecir(Xs)                  # [0,1]
    rul_pred_dias = np.array([modelo_rul.target_a_dias(s, vida) for s in salud_pred])
    rul_real_dias = frac_lin * vida

    # Crear/actualizar rodamiento
    rod = db.query(Rodamiento).filter(Rodamiento.nombre == nombre).first()
    if not rod:
        rod = Rodamiento(nombre=nombre)
        db.add(rod); db.commit(); db.refresh(rod)

    rod.ubicacion = f"IMS Dataset · {test_name}"
    rod.tipo = "Rexnord ZA-2115 (doble fila)"
    rod.fecha_instalacion = datos["fecha_inicio"]
    rod.rul_real = round(float(rul_real_dias[-1]), 2)
    rod.rul_predicho = round(float(rul_pred_dias[-1]), 2)
    rod.estado = modelo_rul.target_a_estado(salud_pred[-1])

    # Mediciones para las gráficas: RMS, pico y desviación estándar reales de la señal.
    paso = max(1, len(Xs) // MUESTRA_POR_RODAMIENTO)
    for i in range(0, len(Xs), paso):
        rms = float(feats_raw[i][0])
        peak = float(feats_raw[i][1])
        std = float(feats_raw[i][2])
        db.add(Medicion(
            rodamiento_id=rod.id, timestamp=fechas[i],
            vib_x=rms, vib_y=peak, vib_z=std, temperatura=0.0,
        ))

    # Predicciones: RUL real vs predicho (en días, ~40 puntos)
    paso_p = max(1, len(Xs) // 40)
    for i in range(0, len(Xs), paso_p):
        dp = float(rul_pred_dias[i])
        dr = float(rul_real_dias[i])
        db.add(Prediccion(
            rodamiento_id=rod.id, timestamp=fechas[i],
            rul_predicho=round(dp, 2), rul_real=round(dr, 2),
            error=round(abs(dp - dr), 2),
        ))

    # Alertas según estado actual
    estado = rod.estado
    rul_f = float(rul_pred_dias[-1])
    
    # Verificar si ya existe una alerta para este rodamiento
    alerta_existente = db.query(Alerta).filter(Alerta.rodamiento_id == rod.id).first()
    
    if not alerta_existente:
        if estado == "Crítico":
            db.add(Alerta(rodamiento_id=rod.id, tipo="critical",
                          mensaje=f"{nombre}: estado crítico, intervención inmediata",
                          dias_restantes=rul_f))
        elif estado == "Degradación":
            db.add(Alerta(rodamiento_id=rod.id, tipo="warning",
                          mensaje=f"{nombre}: en degradación, planificar mantenimiento",
                          dias_restantes=rul_f))

    db.commit()
    print(f" [OK] {nombre:22s} | {estado:12s} | salud {salud_pred[-1]:.2f} | "
          f"RUL pred {rod.rul_predicho:6.1f}d")

    return {
        "nombre": nombre, "test": test_name, "estado": estado,
        "rul_real": rod.rul_real, "rul_predicho": rod.rul_predicho,
        "salud": round(float(salud_pred[-1]), 2),
        "vida_total_dias": vida, "n_archivos": datos["n_archivos"],
    }


def determinar_estado(rul):
    """Estado por días restantes (se mantiene para /api/upload y compatibilidad)."""
    if rul > 30:
        return "Normal"
    if rul > 10:
        return "Degradación"
    return "Crítico"


# ----------------------------------------------------------------------------
# PROCESAMIENTO DEL DATASET COMPLETO
# ----------------------------------------------------------------------------

def procesar_dataset_ims(base_path):
    """
    Orquesta el flujo completo en 3 fases:
      FASE 1: extraer features + RUL real de los 12 rodamientos
      FASE 2: entrenar la red neuronal UNA vez (validación leave-bearings-out)
      FASE 3: usar el modelo entrenado para predecir y poblar la BD
    """
    import modelo_rul

    # ---------- FASE 1: EXTRACCIÓN ----------
    print(f"\n{'='*70}\n  FASE 1/3 — EXTRACCIÓN DE FEATURES\n{'='*70}")
    datos_rodamientos = []
    for test_name, cfg in TEST_CONFIG.items():
        test_path = Path(base_path) / test_name
        if not test_path.exists():
            print(f"\n[!] {test_path} no existe, se omite")
            continue
        print(f"\n ── {test_name} ──")
        for b in range(1, cfg["n_bearings"] + 1):
            datos = extraer_datos_rodamiento(test_name, b, test_path)
            if datos:
                datos_rodamientos.append(datos)

    if len(datos_rodamientos) < 3:
        print("\n[X] No hay suficientes rodamientos para entrenar (mínimo 3).")
        return []

    # ---------- FASE 2: ENTRENAMIENTO ----------
    print(f"\n{'='*70}\n  FASE 2/3 — ENTRENAMIENTO DE LA RED NEURONAL\n{'='*70}")
    datos_entrenamiento = [
        {"nombre": d["nombre"], "X": d["X"], "frac": d["frac"],
         "vida_dias": d["vida_total_dias"]}
        for d in datos_rodamientos
    ]
    metricas = modelo_rul.entrenar(datos_entrenamiento, epochs=200, verbose=1)

    # ---------- FASE 3: PREDICCIÓN + BD ----------
    print(f"\n{'='*70}\n  FASE 3/3 — PREDICCIÓN Y GUARDADO EN BASE DE DATOS\n{'='*70}\n")
    # El dataset es run-to-failure (todos los rodamientos llegan a la falla), por
    # lo que su último punto siempre es RUL=0. Para el panel de monitoreo simulamos
    # una FLOTA realista: cada rodamiento está en un punto distinto de su vida útil.
    # El modelo (validado con R² sobre trayectorias completas) predice la salud de
    # cada uno en su instante actual.
    n = len(datos_rodamientos)
    fracs_actuales = np.linspace(0.45, 0.99, n)          # vida transcurrida "ahora"
    rng = np.random.default_rng(7)
    rng.shuffle(fracs_actuales)                          # mezclar para variar por test

    db = SessionLocal()
    resultados = []
    try:
        for datos, frac_act in zip(datos_rodamientos, fracs_actuales):
            res = poblar_bd_rodamiento(datos, db, frac_actual=float(frac_act))
            if res:
                resultados.append(res)
    finally:
        db.close()

    # Adjuntar métricas globales al resumen
    for r in resultados:
        r["_metricas"] = metricas
    return resultados


def procesar_csv_ims(file_path, db):
    """
    Procesa un único archivo subido vía /api/upload.
    Nota: el modelo necesita la HISTORIA del rodamiento (baseline + tendencia)
    para una predicción fiable. Con un solo archivo se hace una estimación
    instantánea (tendencia=0, sin baseline propio), por lo que es orientativa.
    """
    import modelo_rul

    data = leer_archivo_ims(Path(file_path))
    if data is None:
        return {"error": "No se pudo leer el archivo"}

    nombre = f"Upload_{Path(file_path).stem}_{datetime.utcnow().strftime('%H%M%S')}"
    rod = Rodamiento(nombre=nombre, ubicacion="Upload manual",
                     tipo="Desconocido", fecha_instalacion=datetime.utcnow())
    db.add(rod); db.commit(); db.refresh(rod)

    # Features del primer canal; el vector de entrada es [features (13), slope=0 (13)]
    feats = np.array(features_de_senal(data[:, 0]))
    X = np.array([np.hstack([feats, np.zeros(N_FEATURES_BASE)])])

    rms = float(feats[0])
    try:
        salud = float(modelo_rul.predecir(X)[0])
    except Exception as e:
        return {"error": f"No se pudo predecir: {e}"}

    rod.rul_predicho = None       # días desconocidos sin la vida del rodamiento
    rod.rul_real = None
    rod.estado = modelo_rul.target_a_estado(salud)
    db.add(Medicion(rodamiento_id=rod.id, vib_x=rms, vib_y=rms, vib_z=rms,
                    temperatura=0.0))
    db.commit()
    return {"nombre": nombre, "salud_restante": round(salud, 2),
            "estado": rod.estado,
            "nota": "Estimación instantánea; el modelo es más preciso con la serie histórica."}


# ----------------------------------------------------------------------------
# MAIN
# ----------------------------------------------------------------------------

if __name__ == "__main__":
    print("="*70)
    print(" PROCESADOR IMS + RED NEURONAL — RUL PREDICTION")
    print("="*70)

    if not os.path.exists(IMS_PATH):
        print(f"\n[X] No se encontró el dataset IMS en: {IMS_PATH}")
        print(" Coloca las carpetas 1st_test / 2nd_test / 3rd_test ahí dentro.")
        print(f" O define la ruta con la variable de entorno IMS_PATH.")
        sys.exit(1)

    print(f"\n Dataset IMS: {IMS_PATH}")
    print(" Procesando 3 experimentos (12 rodamientos) + entrenando red neuronal...")
    resultados = procesar_dataset_ims(IMS_PATH)

    if not resultados:
        print("\n[X] No se procesó ningún rodamiento.")
        sys.exit(1)

    met = resultados[0].get("_metricas", {})
    print("\n" + "="*70)
    print(f" [OK] COMPLETADO: {len(resultados)} rodamientos procesados")
    print("="*70)
    print("\n RESUMEN POR RODAMIENTO:")
    for r in resultados:
        print(f" {r['nombre']:24s} | {r['estado']:12s} | "
              f"RUL pred {r['rul_predicho']:6.1f}d | vida {r['vida_total_dias']}d")

    if met:
        print("\n MÉTRICAS DE LA RED NEURONAL (validación leave-bearings-out):")
        print(f" RMSE = {met['rmse']} días")
        print(f" MAE  = {met['mae']} días")
        print(f" R²   = {met['r2']}")
        print(f" Rodamientos de validación: {', '.join(met['rodamientos_validacion'])}")

    print("\n Ejecuta: python main.py")
    print("="*70)
