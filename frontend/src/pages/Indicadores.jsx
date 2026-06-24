import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Activity, Clock, Wrench, ShieldCheck, TrendingUp, Gauge,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from 'recharts'
import { apiClient } from '../lib/api'

export default function Indicadores() {
  const { data: ind } = useQuery({
    queryKey: ['indicadores'],
    queryFn: apiClient.getIndicadores,
  })
  const { data: porTest = [] } = useQuery({
    queryKey: ['indicadores-test'],
    queryFn: apiClient.getIndicadoresPorTest,
  })
  const { data: modelo } = useQuery({
    queryKey: ['modelo-info'],
    queryFn: apiClient.getModeloInfo,
  })

  if (!ind || !ind.reactivo) {
    return <div className="loading-shimmer h-96 rounded-2xl" />
  }

  const r = ind.reactivo
  const p = ind.predictivo
  const m = ind.mejora

  // Datos comparativos para las barras
  const comparativa = [
    { indicador: 'MTBF (días)', Reactivo: r.mtbf_dias, Predictivo: p.mtbf_dias },
    { indicador: 'Disponibilidad (%)', Reactivo: r.disponibilidad_pct, Predictivo: p.disponibilidad_pct },
    { indicador: 'Confiabilidad (%)', Reactivo: r.confiabilidad_pct, Predictivo: p.confiabilidad_pct },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Indicadores de Confiabilidad</h1>
        <p className="text-slate-600 mt-1">
          Análisis RAM: escenario reactivo (sin predicción) vs. predictivo (con modelo RUL) ·
          basado en {ind.n_rodamientos} rodamientos del IMS Dataset
        </p>
      </div>

      {/* Cards de mejora */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MejoraCard
          icon={Clock} color="from-blue-500 to-blue-600"
          title="MTBF" valor={`${m.mtbf_factor}×`}
          sub={`${r.mtbf_dias}d → ${p.mtbf_dias}d`} delay={0.05}
        />
        <MejoraCard
          icon={Gauge} color="from-green-500 to-green-600"
          title="Disponibilidad" valor={`+${m.disponibilidad_delta_pct}%`}
          sub={`${r.disponibilidad_pct}% → ${p.disponibilidad_pct}%`} delay={0.1}
        />
        <MejoraCard
          icon={ShieldCheck} color="from-purple-500 to-purple-600"
          title="Confiabilidad (30d)" valor={`+${m.confiabilidad_delta_pct}%`}
          sub={`${r.confiabilidad_pct}% → ${p.confiabilidad_pct}%`} delay={0.15}
        />
        <MejoraCard
          icon={TrendingUp} color="from-orange-500 to-orange-600"
          title="Anticipación" valor={`${m.anticipacion_dias}d`}
          sub="margen antes de la falla" delay={0.2}
        />
      </div>

      {/* Tabla comparativa */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }} className="card p-6"
      >
        <h3 className="text-lg font-bold text-slate-900 mb-4">
          Comparativa de Escenarios
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="text-left py-3 px-4 font-medium">Indicador</th>
                <th className="text-center py-3 px-4 font-medium">Reactivo</th>
                <th className="text-center py-3 px-4 font-medium">Predictivo</th>
                <th className="text-center py-3 px-4 font-medium">Mejora</th>
              </tr>
            </thead>
            <tbody>
              <FilaTabla nombre="MTBF — Tiempo medio entre fallas" unidad="días"
                react={r.mtbf_dias} pred={p.mtbf_dias} />
              <FilaTabla nombre="MTTF — Tiempo medio hasta falla" unidad="días"
                react={r.mttf_dias} pred={p.mttf_dias} />
              <FilaTabla nombre="MTTR — Tiempo medio de reparación" unidad="horas"
                react={r.mttr_horas} pred={p.mttr_horas} invertido />
              <FilaTabla nombre="Disponibilidad" unidad="%"
                react={r.disponibilidad_pct} pred={p.disponibilidad_pct} />
              <FilaTabla nombre="Confiabilidad (a 30 días)" unidad="%"
                react={r.confiabilidad_pct} pred={p.confiabilidad_pct} />
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-400 mt-4">
          Supuestos: MTTR reactivo 8h (falla imprevista), MTTR predictivo 2h (intervención planificada).
          Confiabilidad R(t) = e^(−t/MTBF). El predictivo interviene al 85% de la vida útil.
        </p>
      </motion.div>

      {/* Gráfico de barras comparativo */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }} className="card p-6"
      >
        <h3 className="text-lg font-bold text-slate-900 mb-4">
          Reactivo vs Predictivo
        </h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={comparativa} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="indicador" stroke="#64748b" style={{ fontSize: '12px' }} />
            <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
            <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
            <Legend />
            <Bar dataKey="Reactivo" fill="#f59e0b" radius={[6, 6, 0, 0]} />
            <Bar dataKey="Predictivo" fill="#3b82f6" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* MTBF por experimento */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }} className="card p-6"
      >
        <h3 className="text-lg font-bold text-slate-900 mb-1">
          Validación por Experimento
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          MTBF observado en cada experimento del IMS — consistencia del modelo
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={porTest} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="test" stroke="#64748b" style={{ fontSize: '12px' }} />
            <YAxis stroke="#64748b" style={{ fontSize: '12px' }} unit="d" />
            <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
            <Bar dataKey="mtbf_dias" name="MTBF (días)" fill="#8b5cf6" radius={[6, 6, 0, 0]}>
              {porTest.map((_, i) => (
                <Cell key={i} fill={['#3b82f6', '#8b5cf6', '#10b981'][i % 3]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Red Neuronal — detalles para la defensa */}
      {modelo && modelo.entrenado && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }} className="card p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Red Neuronal</h3>
              <p className="text-sm text-slate-500">
                Validación con split estratificado 80/20 por rodamiento
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            <MetricaModelo label="R²" valor={modelo.r2} />
            <MetricaModelo label="R² degradación" valor={modelo.r2_degradacion ?? '—'} />
            <MetricaModelo label="RMSE" valor={`${modelo.rmse} días`} />
            <MetricaModelo label="Varianza PCA" valor={`${(modelo.varianza_pca * 100).toFixed(1)}%`} />
          </div>

          <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex flex-wrap gap-x-2">
              <span className="text-slate-500">Arquitectura:</span>
              <span className="font-mono text-slate-800">{modelo.arquitectura}</span>
            </div>
            <div className="flex flex-wrap gap-x-2">
              <span className="text-slate-500">Objetivo:</span>
              <span className="text-slate-800">{modelo.objetivo ?? 'salud restante'}</span>
            </div>
            <div className="flex flex-wrap gap-x-2">
              <span className="text-slate-500">Entrada:</span>
              <span className="text-slate-800">
                {modelo.n_features_entrada ?? 26} features (13 por canal: temporales + espectrales FFT, normalizadas por baseline + tendencia) → PCA {modelo.n_componentes_pca}D
              </span>
            </div>
            <div className="flex flex-wrap gap-x-2">
              <span className="text-slate-500">Muestras:</span>
              <span className="text-slate-800">
                {modelo.n_muestras_train} entrenamiento · {modelo.n_muestras_val} validación
              </span>
            </div>
            <div className="flex flex-wrap gap-x-2">
              <span className="text-slate-500">Validación:</span>
              <span className="text-slate-800">{modelo.esquema_validacion ?? 'split estratificado 80/20'}</span>
            </div>
            <div className="flex flex-wrap gap-x-2">
              <span className="text-slate-500">Épocas entrenadas:</span>
              <span className="text-slate-800">{modelo.epocas}</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

function MetricaModelo({ label, valor }) {
  return (
    <div className="text-center p-3 bg-slate-50 rounded-lg">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-xl font-bold text-slate-900 mt-1">{valor}</p>
    </div>
  )
}

function MejoraCard({ icon: Icon, color, title, valor, sub, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay }} whileHover={{ y: -4 }}
      className="card p-6 relative overflow-hidden"
    >
      <div className={`w-12 h-12 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center shadow-lg mb-4`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <p className="text-sm text-slate-600 font-medium">{title}</p>
      <p className="text-3xl font-bold text-slate-900 mt-1">{valor}</p>
      <p className="text-xs text-slate-500 mt-1">{sub}</p>
      <div className={`absolute -right-8 -bottom-8 w-32 h-32 bg-gradient-to-br ${color} rounded-full opacity-5`} />
    </motion.div>
  )
}

function FilaTabla({ nombre, unidad, react, pred, invertido = false }) {
  // invertido = true cuando "menos es mejor" (MTTR)
  const mejora = invertido
    ? (react > 0 ? ((react - pred) / react * 100) : 0)
    : (react > 0 ? ((pred - react) / react * 100) : 0)
  const positivo = mejora >= 0

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50">
      <td className="py-3 px-4 text-slate-700">{nombre}</td>
      <td className="py-3 px-4 text-center font-medium text-slate-900">
        {react} <span className="text-slate-400 text-xs">{unidad}</span>
      </td>
      <td className="py-3 px-4 text-center font-medium text-slate-900">
        {pred} <span className="text-slate-400 text-xs">{unidad}</span>
      </td>
      <td className="py-3 px-4 text-center">
        <span className={`badge ${positivo ? 'badge-success' : 'badge-danger'}`}>
          {positivo ? '↑' : '↓'} {Math.abs(mejora).toFixed(0)}%
        </span>
      </td>
    </tr>
  )
}
