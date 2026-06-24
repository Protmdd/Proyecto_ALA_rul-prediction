import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Rodamientos from './pages/Rodamientos'
import RodamientoDetalle from './pages/RodamientoDetalle'
import Predicciones from './pages/Predicciones'
import Indicadores from './pages/Indicadores'
import Alertas from './pages/Alertas'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/rodamientos" element={<Rodamientos />} />
        <Route path="/rodamientos/:id" element={<RodamientoDetalle />} />
        <Route path="/predicciones" element={<Predicciones />} />
        <Route path="/indicadores" element={<Indicadores />} />
        <Route path="/alertas" element={<Alertas />} />
      </Routes>
    </Layout>
  )
}

export default App
