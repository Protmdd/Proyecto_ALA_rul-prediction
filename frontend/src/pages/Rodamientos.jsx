import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Search,
  Filter,
  Download,
  ChevronRight,
  Activity,
  MapPin,
  Calendar,
} from 'lucide-react'
import { apiClient } from '../lib/api'

export default function Rodamientos() {
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  
  const { data: rodamientos = [], isLoading } = useQuery({
    queryKey: ['rodamientos'],
    queryFn: apiClient.getRodamientos,
  })
  
  const rodamientosFiltrados = rodamientos.filter(r => {
    const matchBusqueda = r.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                          r.ubicacion.toLowerCase().includes(busqueda.toLowerCase())
    const matchEstado = filtroEstado === 'todos' || r.estado === filtroEstado
    return matchBusqueda && matchEstado
  })
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Rodamientos</h1>
          <p className="text-slate-600 mt-1">
            Gestión de {rodamientos.length} rodamientos monitoreados
          </p>
        </div>
        <button
          onClick={() => apiClient.exportCSV()}
          className="btn-primary flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>
      
      {/* Filters */}
      <div className="card p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre o ubicación..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos los estados</option>
            <option value="Normal">Normal</option>
            <option value="Degradación">Degradación</option>
            <option value="Crítico">Crítico</option>
          </select>
        </div>
      </div>
      
      {/* Grid de Rodamientos */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 loading-shimmer rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rodamientosFiltrados.map((rod, idx) => (
            <RodamientoCard key={rod.id} rodamiento={rod} delay={idx * 0.05} />
          ))}
        </div>
      )}
      
      {rodamientosFiltrados.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <p className="text-slate-500">No se encontraron rodamientos</p>
        </div>
      )}
    </div>
  )
}

function RodamientoCard({ rodamiento, delay }) {
  const estadoColors = {
    Normal: 'border-green-500 bg-green-50',
    Degradación: 'border-yellow-500 bg-yellow-50',
    Crítico: 'border-red-500 bg-red-50',
  }
  
  const estadoBadges = {
    Normal: 'badge-success',
    Degradación: 'badge-warning',
    Crítico: 'badge-danger',
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4 }}
    >
      <Link
        to={`/rodamientos/${rodamiento.id}`}
        className={`card card-hover block border-l-4 ${estadoColors[rodamiento.estado]}`}
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <Activity className="w-5 h-5 text-slate-700" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">{rodamiento.nombre}</h3>
                <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                  <MapPin className="w-3 h-3" />
                  {rodamiento.ubicacion}
                </div>
              </div>
            </div>
            <span className={`badge ${estadoBadges[rodamiento.estado]}`}>
              {rodamiento.estado}
            </span>
          </div>
          
          <div className="space-y-3 mb-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">RUL Predicho</p>
              <p className="text-2xl font-bold text-slate-900">
                {rodamiento.rul_predicho.toFixed(1)}
                <span className="text-sm font-normal text-slate-500 ml-1">días</span>
              </p>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">RUL Real:</span>
              <span className="font-semibold text-slate-900">
                {rodamiento.rul_real.toFixed(1)} días
              </span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Error:</span>
              <span className="font-semibold text-slate-900">
                ±{Math.abs(rodamiento.rul_predicho - rodamiento.rul_real).toFixed(2)} días
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Calendar className="w-3 h-3" />
              {rodamiento.tipo}
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
