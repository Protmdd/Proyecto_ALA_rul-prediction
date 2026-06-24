"""
Indicadores de ingeniería de confiabilidad (RAM Analysis).
Calcula MTBF, MTTF, MTTR, Disponibilidad y Confiabilidad a partir de los
rodamientos del dataset IMS, comparando dos escenarios:
  - Reactivo  : sin mantenimiento predictivo (se opera hasta la falla)
  - Predictivo: con el modelo RUL (se interviene antes de la falla)
"""

import numpy as np

# Supuestos de mantenimiento (horas). Documentados para la defensa:
MTTR_REACTIVO_H = 8.0     # reparación tras falla imprevista
MTTR_PREDICTIVO_H = 2.0   # intervención planificada
# Margen de anticipación: el predictivo interviene cuando queda este % de vida
ANTICIPACION = 0.85       # interviene al 85% de la vida (deja 15% de colchón)


def _vida_util_dias(rodamientos):
    """Vida observada de cada rodamiento (días desde instalación hasta falla)."""
    vidas = []
    for r in rodamientos:
        # rul_real al final es ~0; la vida total se infiere de la primera predicción
        vidas.append(max(r.rul_real, 0) + _dias_operados(r))
    return [v for v in vidas if v > 0]


def _dias_operados(rodamiento):
    """Aproxima días operados usando mediciones registradas."""
    if not rodamiento.mediciones:
        return 0.0
    ts = [m.timestamp for m in rodamiento.mediciones if m.timestamp]
    if len(ts) < 2:
        return 0.0
    return (max(ts) - min(ts)).total_seconds() / 86400.0


def calcular_indicadores(db):
    from main import Rodamiento  # import diferido para evitar ciclo
    rodamientos = db.query(Rodamiento).all()
    if not rodamientos:
        return _vacio()

    # Vida total observada por rodamiento (días)
    vidas = []
    for r in rodamientos:
        vida = _dias_operados(r)
        if vida <= 0:
            vida = max(r.rul_real, 0)
        if vida > 0:
            vidas.append(vida)

    if not vidas:
        return _vacio()

    vidas = np.array(vidas)
    n = len(vidas)

    # --- Escenario REACTIVO ---
    # MTBF ≈ vida media hasta falla (cada rodamiento llega hasta el fallo)
    mtbf_react_h = float(np.mean(vidas)) * 24.0
    mttr_react_h = MTTR_REACTIVO_H
    disp_react = mtbf_react_h / (mtbf_react_h + mttr_react_h)

    # --- Escenario PREDICTIVO ---
    # Se interviene antes de la falla → el ciclo útil entre intervenciones es
    # mayor (no hay paradas catastróficas) y el tiempo de reparación es menor.
    mtbf_pred_h = float(np.mean(vidas)) * 24.0 / ANTICIPACION
    mttr_pred_h = MTTR_PREDICTIVO_H
    disp_pred = mtbf_pred_h / (mtbf_pred_h + mttr_pred_h)

    # Confiabilidad R(t) = exp(-t/MTBF) evaluada a un horizonte fijo (30 días)
    t_horizonte_h = 30 * 24.0
    conf_react = float(np.exp(-t_horizonte_h / mtbf_react_h))
    conf_pred = float(np.exp(-t_horizonte_h / mtbf_pred_h))

    # Tiempo de anticipación promedio que ofrece el modelo (días)
    anticipacion_dias = float(np.mean(vidas) * (1 - ANTICIPACION))

    return {
        "horizonte_confiabilidad_dias": 30,
        "n_rodamientos": n,
        "reactivo": {
            "mtbf_dias": round(mtbf_react_h / 24, 1),
            "mttf_dias": round(float(np.mean(vidas)), 1),
            "mttr_horas": round(mttr_react_h, 1),
            "disponibilidad_pct": round(disp_react * 100, 2),
            "confiabilidad_pct": round(conf_react * 100, 1),
        },
        "predictivo": {
            "mtbf_dias": round(mtbf_pred_h / 24, 1),
            "mttf_dias": round(float(np.mean(vidas)) / ANTICIPACION, 1),
            "mttr_horas": round(mttr_pred_h, 1),
            "disponibilidad_pct": round(disp_pred * 100, 2),
            "confiabilidad_pct": round(conf_pred * 100, 1),
        },
        "mejora": {
            "mtbf_factor": round(mtbf_pred_h / mtbf_react_h, 2),
            "disponibilidad_delta_pct": round((disp_pred - disp_react) * 100, 2),
            "confiabilidad_delta_pct": round((conf_pred - conf_react) * 100, 1),
            "anticipacion_dias": round(anticipacion_dias, 1),
        },
    }


def indicadores_por_test(db):
    """MTBF y vida media agrupados por experimento (1st/2nd/3rd)."""
    from main import Rodamiento
    rodamientos = db.query(Rodamiento).all()
    grupos = {}
    for r in rodamientos:
        test = (r.ubicacion or "").split("·")[-1].strip() or "N/A"
        vida = _dias_operados(r) or max(r.rul_real, 0)
        grupos.setdefault(test, []).append(vida)

    salida = []
    for test, vidas in sorted(grupos.items()):
        vidas = [v for v in vidas if v > 0]
        if not vidas:
            continue
        salida.append({
            "test": test,
            "n_rodamientos": len(vidas),
            "mtbf_dias": round(float(np.mean(vidas)), 1),
            "vida_min_dias": round(float(np.min(vidas)), 1),
            "vida_max_dias": round(float(np.max(vidas)), 1),
        })
    return salida


def _vacio():
    return {
        "n_rodamientos": 0,
        "reactivo": {}, "predictivo": {}, "mejora": {},
    }
