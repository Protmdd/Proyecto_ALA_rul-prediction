import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Activity,
  Bell,
  TrendingUp,
  AlertCircle,
  Target,
  Zap,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Link } from 'react-router-dom'
import { apiClient } from '../lib/api'

export default function Dashboard() {
  const { data: resumen, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: apiClient.getDashboardResumen,
    refetchInterval: 30000, // Refresh cada 30s
  })
  
  const { data: comparativa } = useQuery({
    queryKey: ['comparativa'],
    queryFn: apiClient.getComparativa,
  })
  
  if (isLoading) {
    return <DashboardSkeleton />
  }
  
  const metricas = resumen?.metricas || {
    rmse: 3.5,
    mae: 2.8,
    r2: 0.82,
    total_rodamientos: 12,
    rodamientos_criticos: 2,
    alertas_activas: 3,
  }
  
  const rodamientos = resumen?.rodamientos || []
  const alertas = resumen?.alertas_recientes || []
  
  // Datos para distribución de estados
  const estadosData = [
    { 
      name: 'Normal', 
      value: rodamientos.filter(r => r.estado === 'Normal').length,
      color: '#22c55e'
    },
    { 
      name: 'Degradación', 
      value: rodamientos.filter(r => r.estado === 'Degradación').length,
      color: '#f59e0b'
    },
    { 
      name: 'Crítico', 
      value: rodamientos.filter(r => r.estado === 'Crítico').length,
      color: '#ef4444'
    },
  ]
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Sistema de Mantenimiento Predictivo
            </h1>
            <p className="text-slate-600 mt-1">
              Predicción de RUL mediante PCA + Redes Neuronales · IMS Bearing Dataset (NASA)
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">
              Última actualización: {new Date().toLocaleTimeString('es-PE')}
            </span>
          </div>
        </div>
      </motion.div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          icon={Target}
          title="RMSE"
          value={`${metricas.rmse} días`}
          subtitle="Error de predicción"
          color="blue"
          trend="-12%"
          trendDirection="down"
          good={true}
          delay={0.1}
        />
        <KPICard
          icon={TrendingUp}
          title="R² Score"
          value={metricas.r2}
          subtitle="Varianza explicada"
          color="purple"
          trend="+5%"
          trendDirection="up"
          good={true}
          delay={0.2}
        />
        <KPICard
          icon={Activity}
          title="Rodamientos"
          value={metricas.total_rodamientos}
          subtitle={`${metricas.rodamientos_criticos} críticos`}
          color="green"
          delay={0.3}
        />
        <KPICard
          icon={Bell}
          title="Alertas Activas"
          value={metricas.alertas_activas}
          subtitle="Rodamientos que requieren atención"
          color="orange"
          delay={0.4}
        />
      </div>
      
      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Predicción vs Realidad */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2 card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Predicción vs Realidad
              </h3>
              <p className="text-sm text-slate-500">
                Validación del modelo de RUL
              </p>
            </div>
            <div className="badge badge-info">
              {comparativa?.length || 0} predicciones
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                type="number"
                dataKey="rul_real"
                name="RUL Real"
                unit=" días"
                stroke="#64748b"
                style={{ fontSize: '12px' }}
                label={{ value: 'RUL Real (días)', position: 'insideBottom', offset: -10 }}
              />
              <YAxis
                type="number"
                dataKey="rul_predicho"
                name="RUL Predicho"
                unit=" días"
                stroke="#64748b"
                style={{ fontSize: '12px' }}
                label={{ value: 'RUL Predicho (días)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                }}
              />
              <Scatter
                name="Predicciones"
                data={comparativa || []}
                fill="#3b82f6"
              />
              {/* Línea ideal */}
              <Line
                type="monotone"
                dataKey="ideal"
                stroke="#ef4444"
                strokeDasharray="5 5"
                dot={false}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </motion.div>
        
        {/* Distribución de Estados */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="card p-6"
        >
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900">
              Estado de Rodamientos
            </h3>
            <p className="text-sm text-slate-500">
              Distribución actual
            </p>
          </div>
          
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={estadosData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {estadosData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          
          <div className="mt-4 space-y-2">
            {estadosData.map((estado) => (
              <div key={estado.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: estado.color }}
                  />
                  <span className="text-sm text-slate-700">{estado.name}</span>
                </div>
                <span className="text-sm font-semibold text-slate-900">
                  {estado.value}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
      
      {/* Rodamientos Críticos + Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Rodamientos Críticos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Rodamientos por Estado
              </h3>
              <p className="text-sm text-slate-500">
                Listado priorizado por urgencia
              </p>
            </div>
            <Link
              to="/rodamientos"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Ver todos
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="space-y-2 max-h-80 overflow-auto">
            {rodamientos
              .sort((a, b) => a.rul_predicho - b.rul_predicho)
              .slice(0, 6)
              .map((rod, idx) => (
                <Link
                  key={rod.id}
                  to={`/rodamientos/${rod.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`
                      w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm
                      ${rod.estado === 'Crítico' ? 'bg-red-100 text-red-700' :
                        rod.estado === 'Degradación' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'}
                    `}>
                      #{idx + 1}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 group-hover:text-blue-600">
                        {rod.nombre}
                      </p>
                      <p className="text-xs text-slate-500">{rod.ubicacion}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`
                      font-bold
                      ${rod.estado === 'Crítico' ? 'text-red-600' :
                        rod.estado === 'Degradación' ? 'text-yellow-600' :
                        'text-green-600'}
                    `}>
                      {rod.rul_predicho.toFixed(1)} días
                    </p>
                    <span className={`badge ${
                      rod.estado === 'Crítico' ? 'badge-danger' :
                      rod.estado === 'Degradación' ? 'badge-warning' :
                      'badge-success'
                    }`}>
                      {rod.estado}
                    </span>
                  </div>
                </Link>
              ))}
          </div>
        </motion.div>
        
        {/* Alertas Recientes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Alertas Activas
              </h3>
              <p className="text-sm text-slate-500">
                Notificaciones del sistema
              </p>
            </div>
            <Link
              to="/alertas"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Ver todas
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="space-y-3 max-h-80 overflow-auto">
            {alertas.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No hay alertas activas</p>
              </div>
            ) : (
              alertas.map((alerta) => (
                <div
                  key={alerta.id}
                  className={`
                    p-4 rounded-lg border-l-4
                    ${alerta.tipo === 'critical' ? 'bg-red-50 border-red-500' :
                      alerta.tipo === 'warning' ? 'bg-yellow-50 border-yellow-500' :
                      'bg-blue-50 border-blue-500'}
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className={`
                          w-4 h-4
                          ${alerta.tipo === 'critical' ? 'text-red-600' :
                            alerta.tipo === 'warning' ? 'text-yellow-600' :
                            'text-blue-600'}
                        `} />
                        <span className={`badge ${
                          alerta.tipo === 'critical' ? 'badge-danger' :
                          alerta.tipo === 'warning' ? 'badge-warning' :
                          'badge-info'
                        }`}>
                          {alerta.tipo.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-900 font-medium">
                        {alerta.mensaje}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Rodamiento ID: {alerta.rodamiento_id}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
      
      {/* Info Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <div className="card p-6 bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900">Modelo PCA + ConvNet</h4>
              <p className="text-sm text-slate-600 mt-1">
                Reducción de dimensionalidad seguida de red neuronal convolucional 1D
              </p>
            </div>
          </div>
        </div>
        
        <div className="card p-6 bg-gradient-to-br from-purple-50 to-purple-100">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900">Dataset IMS NASA</h4>
              <p className="text-sm text-slate-600 mt-1">
                6 meses de datos reales de degradación progresiva
              </p>
            </div>
          </div>
        </div>
        
        <div className="card p-6 bg-gradient-to-br from-green-50 to-green-100">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900">Precisión 82%</h4>
              <p className="text-sm text-slate-600 mt-1">
                R² Score, RMSE ±3 días para predicción RUL
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function KPICard({ icon: Icon, title, value, subtitle, color, trend, trendDirection, good, delay }) {
  const colorMap = {
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
    green: 'from-green-500 to-green-600',
    orange: 'from-orange-500 to-orange-600',
    red: 'from-red-500 to-red-600',
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4 }}
      className="card p-6 relative overflow-hidden"
    >
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 bg-gradient-to-br ${colorMap[color]} rounded-xl flex items-center justify-center shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-medium ${
              (trendDirection === 'up' && good) || (trendDirection === 'down' && good)
                ? 'text-green-600'
                : 'text-red-600'
            }`}>
              {trendDirection === 'up' ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              {trend}
            </div>
          )}
        </div>
        
        <p className="text-sm text-slate-600 font-medium mb-1">{title}</p>
        <p className="text-3xl font-bold text-slate-900 mb-1">{value}</p>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
      
      {/* Decoration */}
      <div className={`absolute -right-8 -bottom-8 w-32 h-32 bg-gradient-to-br ${colorMap[color]} rounded-full opacity-5`} />
    </motion.div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-12 loading-shimmer rounded-lg w-1/2" />
      <div className="grid grid-cols-4 gap-6">
        {[1,2,3,4].map((i) => (
          <div key={i} className="h-32 loading-shimmer rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 h-80 loading-shimmer rounded-2xl" />
        <div className="h-80 loading-shimmer rounded-2xl" />
      </div>
    </div>
  )
}
