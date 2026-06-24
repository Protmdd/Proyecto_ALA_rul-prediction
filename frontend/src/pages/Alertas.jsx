import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Clock,
  ChevronRight,
  Bell,
  CheckCircle2,
} from 'lucide-react'
import { apiClient } from '../lib/api'

export default function Alertas() {
  const { data: alertas = [] } = useQuery({
    queryKey: ['alertas'],
    queryFn: apiClient.getAlertas,
  })
  
  const alertasCriticas = alertas.filter(a => a.tipo === 'critical')
  const alertasWarning = alertas.filter(a => a.tipo === 'warning')
  const alertasInfo = alertas.filter(a => a.tipo === 'info')
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Centro de Alertas</h1>
        <p className="text-slate-600 mt-1">
          Notificaciones del sistema de mantenimiento predictivo
        </p>
      </div>
      
      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card p-6 border-l-4 border-red-500"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 font-medium">Críticas</p>
              <p className="text-4xl font-bold text-red-600 mt-2">
                {alertasCriticas.length}
              </p>
              <p className="text-xs text-slate-500 mt-1">Requieren acción inmediata</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="card p-6 border-l-4 border-yellow-500"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 font-medium">Advertencias</p>
              <p className="text-4xl font-bold text-yellow-600 mt-2">
                {alertasWarning.length}
              </p>
              <p className="text-xs text-slate-500 mt-1">Atención preventiva</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="card p-6 border-l-4 border-blue-500"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 font-medium">Informativas</p>
              <p className="text-4xl font-bold text-blue-600 mt-2">
                {alertasInfo.length}
              </p>
              <p className="text-xs text-slate-500 mt-1">Notificaciones</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Info className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Lista de alertas */}
      <div className="card p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">
          Todas las Alertas ({alertas.length})
        </h3>
        
        {alertas.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-semibold text-slate-900">Sin alertas activas</p>
            <p className="text-sm text-slate-500 mt-1">
              Todos los rodamientos operan dentro de parámetros normales
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {alertas
              .sort((a, b) => a.dias_restantes - b.dias_restantes)
              .map((alerta, idx) => (
                <AlertaItem key={alerta.id} alerta={alerta} delay={idx * 0.05} />
              ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AlertaItem({ alerta, delay }) {
  const config = {
    critical: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: AlertTriangle,
      iconColor: 'text-red-600',
      iconBg: 'bg-red-100',
      badge: 'badge-danger',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: AlertCircle,
      iconColor: 'text-yellow-600',
      iconBg: 'bg-yellow-100',
      badge: 'badge-warning',
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: Info,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100',
      badge: 'badge-info',
    },
  }[alerta.tipo] || {}
  
  const Icon = config.icon
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
    >
      <Link
        to={`/rodamientos/${alerta.rodamiento_id}`}
        className={`block p-4 rounded-xl border ${config.border} ${config.bg} hover:shadow-md transition-shadow group`}
      >
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 ${config.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-5 h-5 ${config.iconColor}`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`badge ${config.badge}`}>
                {alerta.tipo.toUpperCase()}
              </span>
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {alerta.dias_restantes.toFixed(1)} días restantes
              </span>
            </div>
            <p className="font-medium text-slate-900">
              {alerta.mensaje}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Rodamiento ID: {alerta.rodamiento_id}
            </p>
          </div>
          
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
        </div>
      </Link>
    </motion.div>
  )
}
