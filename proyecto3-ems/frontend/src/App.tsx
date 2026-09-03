import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'

interface Hospital {
  nombre: string
  lat: number
  lng: number
  camasLibres: number
  tieneEspecialista: boolean
  estado: 'disponible' | 'sin_cupo'
}

interface EstadoApi {
  ambulancia: { lat: number; lng: number }
  hospitales: Hospital[]
  hospitalElegido: string | null
}

const API_URL = 'http://localhost:8082/api/state'
const PASTO_CENTER: [number, number] = [1.2136, -77.2811]

function hospitalIcon(estado: Hospital['estado']) {
  const color = estado === 'disponible' ? '#16a34a' : '#dc2626'
  return L.divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.4)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

const ambulanceIcon = L.divIcon({
  className: '',
  html: `<div style="font-size:22px;line-height:22px">🚑</div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

function App() {
  const [estado, setEstado] = useState<EstadoApi | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function poll() {
      try {
        const res = await fetch(API_URL)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data: EstadoApi = await res.json()
        if (!cancelled) {
          setEstado(data)
          setError(null)
        }
      } catch (e) {
        if (!cancelled) setError('No se pudo conectar al ApiServer en :8082. ¿Está corriendo?')
      }
    }

    poll()
    const interval = setInterval(poll, 1500)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="app">
      <header>
        <h1>Smart EMS Pasto — Coordinación de Emergencias</h1>
        <span className="status">
          {error ? error : estado ? 'conectado, actualizando cada 1.5s' : 'conectando...'}
        </span>
      </header>
      <div className="body">
        <div className="map-wrap">
          <MapContainer center={PASTO_CENTER} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {estado?.hospitales.map((h) => (
              <Marker key={h.nombre} position={[h.lat, h.lng]} icon={hospitalIcon(h.estado)}>
                <Popup>
                  <strong>{h.nombre}</strong>
                  <br />
                  Camas libres: {h.camasLibres}
                  <br />
                  Especialista: {h.tieneEspecialista ? 'sí' : 'no'}
                  <br />
                  Estado: {h.estado}
                </Popup>
              </Marker>
            ))}
            {estado && (
              <Marker
                position={[estado.ambulancia.lat, estado.ambulancia.lng]}
                icon={ambulanceIcon}
              >
                <Popup>Ambulancia en ruta</Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
        <div className="sidebar">
          <h2>Hospital elegido</h2>
          <div className="elegido-banner">
            <strong>{estado?.hospitalElegido ?? '—'}</strong>
            Seleccionado por el min-heap: especialista disponible + más camas libres.
          </div>

          <h2>Hospitales</h2>
          {estado?.hospitales.map((h) => (
            <div
              key={h.nombre}
              className={`hospital-card ${h.nombre === estado.hospitalElegido ? 'elegido' : ''}`}
            >
              <div className="nombre">{h.nombre}</div>
              Camas libres: {h.camasLibres} · Especialista: {h.tieneEspecialista ? 'sí' : 'no'}
              <span className={`badge ${h.estado}`}>{h.estado.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default App
