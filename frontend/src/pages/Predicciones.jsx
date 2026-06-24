import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts'
import { Target, TrendingUp, Award } from 'lucide-react'
import { apiClient } from '../lib/api'

// R² calculado sobre un subconjunto de puntos (solo se usa en la vista global)
function calcularR2(puntos) {
  if (!puntos || puntos.length < 2) return null
  const media = puntos.reduce((s, p) => s + p.rul_real, 0) / puntos.length
  let ssRes = 0, ssTot = 0
  for (const p of puntos) {
    ssRes += (p.rul_real - p.rul_predicho) ** 2
    ssTot += (p.rul_real - media) ** 2
  }
  if (ssTot === 0) return null
  return 1 - ssRes / ssTot
}

// RMSE y MAE de un subconjunto (métricas interpretables por experimento)
function calcularErrores(puntos) {
  if (!puntos || puntos.length === 0) return { rmse: null, mae: null }
  let se = 0, ae = 0
  for (const p of puntos) {
    const d = p.rul_real - p.rul_predicho
    se += d * d
    ae += Math.abs(d)
  }
  return { rmse: Math.sqrt(se / puntos.length), mae: ae / puntos.length }
}

export default function Predicciones() {
  const [experimento, setExperimento] = useState('Todos')

  const { data: comparativa = [] } = useQuery({
    queryKey: ['comparativa'],
    queryFn: apiClient.getComparativa,
  })
  
  const { data: metricas } = useQuery({
    queryKey: ['metricas'],
    queryFn: apiClient.getMetricas,
  })

  // Experimentos disponibles (1st_test, 2nd_test, 3rd_test)
  const experimentos = ['Todos', ...Array.from(
    new Set(comparativa.map(c => c.test).filter(Boolean))
  ).sort()]

  // Puntos según el filtro activo
  const datos = experimento === 'Todos'
    ? comparativa
    : comparativa.filter(c => c.test === experimento)

  // En la vista global se muestra R²; por experimento se muestran RMSE/MAE locales
  const esGlobal = experimento === 'Todos'
  const erroresLocales = calcularErrores(datos)
  const rmseMostrado = esGlobal ? (metricas?.rmse ?? erroresLocales.rmse) : erroresLocales.rmse
  const maeMostrado = esGlobal ? (metricas?.mae ?? erroresLocales.mae) : erroresLocales.mae
  const r2Global = metricas?.r2 ?? calcularR2(datos)
  
  // Línea ideal (predicción perfecta), ajustada al subconjunto visible
  const maxValue = Math.max(
    ...datos.map(c => Math.max(c.rul_real, c.rul_predicho))
  ) || 180
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Predicciones del Modelo</h1>
        <p className="text-slate-600 mt-1">
          Análisis de precisión: RUL predicho vs RUL real
        </p>
      </div>
      
      {/* Métricas grandes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white"
        >
          <Target className="w-8 h-8 mb-3" />
          <p className="text-blue-100 text-sm font-medium">
            RMSE{!esGlobal ? ` · ${experimento}` : ''}
          </p>
          <p className="text-4xl font-bold mt-1">
            {rmseMostrado != null ? rmseMostrado.toFixed(2) : '—'}
            <span className="text-xl font-normal ml-1">días</span>
          </p>
          <p className="text-blue-100 text-xs mt-2">
            Error promedio de predicción
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="card p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white"
        >
          <TrendingUp className="w-8 h-8 mb-3" />
          {esGlobal ? (
            <>
              <p className="text-purple-100 text-sm font-medium">R² Score</p>
              <p className="text-4xl font-bold mt-1">
                {r2Global != null ? r2Global.toFixed(3) : '—'}
              </p>
              <p className="text-purple-100 text-xs mt-2">
                Varianza explicada por el modelo
              </p>
            </>
          ) : (
            <>
              <p className="text-purple-100 text-sm font-medium">
                Predicciones · {experimento}
              </p>
              <p className="text-4xl font-bold mt-1">{datos.length}</p>
              <p className="text-purple-100 text-xs mt-2">
                Puntos evaluados en este experimento
              </p>
            </>
          )}
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="card p-6 bg-gradient-to-br from-green-500 to-green-600 text-white"
        >
          <Award className="w-8 h-8 mb-3" />
          <p className="text-green-100 text-sm font-medium">
            MAE{!esGlobal ? ` · ${experimento}` : ''}
          </p>
          <p className="text-4xl font-bold mt-1">
            {maeMostrado != null ? maeMostrado.toFixed(2) : '—'}
            <span className="text-xl font-normal ml-1">días</span>
          </p>
          <p className="text-green-100 text-xs mt-2">
            Error absoluto promedio
          </p>
        </motion.div>
      </div>
      
      {/* Scatter Plot Principal */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card p-6"
      >
        <div className="mb-6">
          <h3 className="text-lg font-bold text-slate-900">
            Predicción vs Realidad - Análisis Visual
          </h3>
          <p className="text-sm text-slate-500">
            Cada punto representa una predicción. La línea roja indica la predicción perfecta.
          </p>

          {/* Filtro por experimento */}
          <div className="flex flex-wrap gap-2 mt-4">
            {experimentos.map((exp) => (
              <button
                key={exp}
                onClick={() => setExperimento(exp)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  experimento === exp
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {exp === 'Todos' ? 'Todos los experimentos' : exp}
              </button>
            ))}
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={500}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              type="number"
              dataKey="rul_real"
              name="RUL Real"
              stroke="#64748b"
              domain={[0, Math.ceil(maxValue)]}
              label={{
                value: 'RUL Real (días)',
                position: 'insideBottom',
                offset: -10
              }}
            />
            <YAxis
              type="number"
              dataKey="rul_predicho"
              name="RUL Predicho"
              stroke="#64748b"
              domain={[0, Math.ceil(maxValue)]}
              label={{
                value: 'RUL Predicho (días)',
                angle: -90,
                position: 'insideLeft'
              }}
            />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              }}
              formatter={(value, name) => [`${value.toFixed(2)} días`, name]}
            />
            <Legend />
            
            {/* Línea ideal */}
            <ReferenceLine
              segment={[
                { x: 0, y: 0 },
                { x: Math.ceil(maxValue), y: Math.ceil(maxValue) }
              ]}
              stroke="#ef4444"
              strokeDasharray="5 5"
              label={{ value: 'Predicción perfecta', position: 'top' }}
            />
            
            <Scatter
              name="Predicciones del modelo"
              data={datos}
              fill="#3b82f6"
              fillOpacity={0.6}
            />
          </ScatterChart>
        </ResponsiveContainer>
        
        <div className="mt-6 grid grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-700">{datos.length}</p>
            <p className="text-xs text-slate-600">
              {experimento === 'Todos' ? 'Total de predicciones' : `Predicciones · ${experimento}`}
            </p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-700">
              {erroresLocales.rmse != null ? erroresLocales.rmse.toFixed(2) : '—'}
              <span className="text-sm font-normal ml-1">días</span>
            </p>
            <p className="text-xs text-slate-600">RMSE del conjunto mostrado</p>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg">
            <p className="text-2xl font-bold text-purple-700">
              {erroresLocales.mae != null ? erroresLocales.mae.toFixed(2) : '—'}
              <span className="text-sm font-normal ml-1">días</span>
            </p>
            <p className="text-xs text-slate-600">MAE del conjunto mostrado</p>
          </div>
        </div>
      </motion.div>
      
      {/* Info adicional */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-bold text-slate-900 mb-3">Cómo leer el gráfico</h3>
          <ul className="space-y-2 text-sm text-slate-600">
            <li>Puntos sobre la línea roja: predicción cercana al valor real.</li>
            <li>Puntos por encima de la línea: el modelo sobreestima la vida restante.</li>
            <li>Puntos por debajo: el modelo subestima la vida restante.</li>
            <li>La dispersión respecto a la línea refleja el error del modelo.</li>
          </ul>
        </div>
        
        <div className="card p-6">
          <h3 className="font-bold text-slate-900 mb-3">Significado de las métricas</h3>
          <ul className="space-y-2 text-sm text-slate-600">
            <li><strong>RMSE</strong>: raíz del error cuadrático medio; penaliza los errores grandes.</li>
            <li><strong>MAE</strong>: error absoluto promedio, en días.</li>
            <li><strong>R²</strong>: proporción de varianza explicada (0 a 1; mejor cuanto más cerca de 1).</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
