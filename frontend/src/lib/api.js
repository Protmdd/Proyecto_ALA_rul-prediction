import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para manejo de errores
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)

// ============================================================================
// API METHODS
// ============================================================================

export const apiClient = {
  // Health
  health: () => api.get('/health'),
  
  // Rodamientos
  getRodamientos: () => api.get('/rodamientos'),
  getRodamiento: (id) => api.get(`/rodamientos/${id}`),
  getMediciones: (id, limit = 100) => api.get(`/rodamientos/${id}/mediciones?limit=${limit}`),
  getPredicciones: (id) => api.get(`/rodamientos/${id}/predicciones`),
  
  // Predicciones
  getComparativa: () => api.get('/predicciones/comparativa'),
  
  // Alertas
  getAlertas: () => api.get('/alertas'),
  getAlertasCriticas: () => api.get('/alertas/criticas'),
  
  // Métricas
  getMetricas: () => api.get('/metricas'),
  
  // Indicadores de confiabilidad
  getIndicadores: () => api.get('/indicadores'),
  getIndicadoresPorTest: () => api.get('/indicadores/por-test'),
  
  // Info de la red neuronal
  getModeloInfo: () => api.get('/modelo/info'),
  
  // Dashboard
  getDashboardResumen: () => api.get('/dashboard/resumen'),
  
  // Upload
  uploadCSV: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return axios.post('/api/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  
  // Export
  exportCSV: () => window.open('/api/export/csv', '_blank'),
}

export default apiClient
