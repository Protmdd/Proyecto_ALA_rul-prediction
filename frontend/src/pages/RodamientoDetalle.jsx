import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Activity,
  Thermometer,
  TrendingUp,
  MapPin,
  Calendar,
  AlertTriangle,
} from 'lucide-react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { apiClient } from '../lib/api'

export default function RodamientoDetalle() {
  const { id } = useParams()
  
  const { data: rodamiento } = useQuery({
    queryKey: ['rodamiento', id],
    queryFn: () => apiClient.getRodamiento(id),
  })
  
  const { data: mediciones = [] } = useQuery({
    queryKey: ['mediciones', id],
    queryFn: () => apiClient.getMediciones(id, 100),
  })
  
  const { data: predicciones = [] } = useQuery({
    queryKey: ['predicciones', id],
    queryFn: () => apiClient.getPredicciones(id),
  })
  
  if (!rodamiento) {
    return <div className="loading-shimmer h-96 rounded-2xl" />
  }
  
  // Preparar datos para gráficos.
  // vib_x = RMS, vib_y = Pico, vib_z = desviación estándar (features reales de la señal).
  // El factor de cresta (Pico/RMS) es un indicador de defecto: crece con la degradación.
  const vibracionesData = mediciones
    .slice()
    .reverse()
    .map((m, idx) => ({
      tiempo: idx,
      vib_x: m.vib_x,
      vib_y: m.vib_y,
      vib_z: m.vib_z,
      crest: m.vib_x > 1e-9 ? m.vib_y / m.vib_x : 0,
    }))
  
  const prediccionesData = predicciones
    .slice()
    .reverse()
    .map((p, idx) => ({
      tiempo: idx,
      real: p.rul_real,
      predicho: p.rul_predicho,
    }))
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button */}
      <Link
        to="/rodamientos"
        className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a Rodamientos
      </Link>
      
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {rodamiento.nombre}
              </h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {rodamiento.ubicacion}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {rodamiento.tipo}
                </span>
              </div>
            </div>
          </div>
          
          <span className={`badge text-sm px-4 py-2 ${
            rodamiento.estado === 'Crítico' ? 'badge-danger' :
            rodamiento.estado === 'Degradación' ? 'badge-warning' :
            'badge-success'
          }`}>
            {rodamiento.estado === 'Crítico' && <AlertTriangle className="w-4 h-4 mr-1" />}
            {rodamiento.estado}
          </span>
        </div>
      </motion.div>
      
      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricaCard
          title="RUL Predicho"
          value={`${rodamiento.rul_predicho.toFixed(1)} días`}
          color="from-blue-500 to-blue-600"
          icon={TrendingUp}
        />
        <MetricaCard
          title="RUL Real"
          value={`${rodamiento.rul_real.toFixed(1)} días`}
          color="from-purple-500 to-purple-600"
          icon={Activity}
        />
        <MetricaCard
          title="Error Absoluto"
          value={`±${Math.abs(rodamiento.rul_predicho - rodamiento.rul_real).toFixed(2)} días`}
          color="from-green-500 to-green-600"
          icon={Thermometer}
        />
      </div>
      
      {/* Gráfico Vibraciones */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card p-6"
      >
        <div className="mb-4">
          <h3 className="text-lg font-bold text-slate-900">
            Señales de Vibración
          </h3>
          <p className="text-sm text-slate-500">
            Indicadores de la señal de vibración (acelerómetros PCB 353B33) — magnitud combinada de los canales del rodamiento
          </p>
        </div>
        
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={vibracionesData}>
            <defs>
              <linearGradient id="colorX" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorY" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="tiempo"
              stroke="#64748b"
              style={{ fontSize: '12px' }}
              label={{ value: 'Tiempo (muestras)', position: 'insideBottom', offset: -5 }}
            />
            <YAxis
              stroke="#64748b"
              style={{ fontSize: '12px' }}
              label={{ value: 'Amplitud (g)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Line type="monotone" dataKey="vib_x" stroke="#3b82f6" strokeWidth={2} dot={false} name="RMS" />
            <Line type="monotone" dataKey="vib_y" stroke="#10b981" strokeWidth={2} dot={false} name="Pico" />
            <Line type="monotone" dataKey="vib_z" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Desv. estándar" />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>
      
      {/* Gráficos en grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Factor de cresta (indicador de defecto, derivado de la señal) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-6"
        >
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-900">
              Factor de cresta
            </h3>
            <p className="text-sm text-slate-500">
              Pico/RMS de la vibración; tiende a aumentar al aparecer defectos
            </p>
          </div>
          
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={vibracionesData}>
              <defs>
                <linearGradient id="colorCrest" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="tiempo" stroke="#64748b" style={{ fontSize: '12px' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
                formatter={(value) => [Number(value).toFixed(2), 'Factor de cresta']}
              />
              <Area
                type="monotone"
                dataKey="crest"
                stroke="#f59e0b"
                fillOpacity={1}
                fill="url(#colorCrest)"
                strokeWidth={2}
                name="Factor de cresta"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
        
        {/* Predicción vs Realidad */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card p-6"
        >
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-900">
              Predicción vs Realidad
            </h3>
            <p className="text-sm text-slate-500">
              Histórico de predicciones RUL
            </p>
          </div>
          
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={prediccionesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="tiempo" stroke="#64748b" style={{ fontSize: '12px' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '12px' }} unit=" días" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="real" stroke="#3b82f6" strokeWidth={2} name="RUL Real" />
              <Line type="monotone" dataKey="predicho" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" name="RUL Predicho" />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  )
}

function MetricaCard({ title, value, color, icon: Icon }) {
  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 bg-gradient-to-br ${color} rounded-lg flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <p className="text-sm font-medium text-slate-600">{title}</p>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  )
}
