import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'

interface Hospital {
  nombre: string
  lat: number
  lng: number
  camasLibres: number
  especialidad: string
  estado: 'disponible' | 'sin_cupo'
}

type EstadoAmbulancia =
  | 'disponible'
  | 'hacia_accidente'
  | 'en_escena'
  | 'en_escena_esperando_hospital'
  | 'hacia_hospital'

interface Ambulancia {
  id: string
  nombre: string
  lat: number
  lng: number
  estado: EstadoAmbulancia
  hospitalDestino: string | null
}

type EstadoAccidente =
  | 'esperando_ambulancia'
  | 'en_camino'
  | 'esperando_hospital'
  | 'trasladando'
  | 'resuelto'

interface Accidente {
  lat: number
  lng: number
  estado: EstadoAccidente
  ambulanciaId: string | null
  hospitalDestino: string | null
  especialistaRequerido: string
  siguientePaso: string | null
  guiaPasos: string[]
  pasoActual: number
  resumenClinico: string[]
}

interface EstadoApi {
  tick: number
  hospitales: Hospital[]
  ambulancias: Ambulancia[]
  accidente: Accidente | null
  eventos: string[]
}

const API_URL = 'http://localhost:8082/api/state'
const PASTO_CENTER: [number, number] = [1.2136, -77.2811]

const AMBULANCIA_LABELS: Record<EstadoAmbulancia, string> = {
  disponible: 'disponible',
  hacia_accidente: 'en camino al accidente',
  en_escena: 'atendiendo en la escena',
  en_escena_esperando_hospital: 'esperando cupo de hospital',
  hacia_hospital: 'trasladando paciente',
}

const ACCIDENTE_LABELS: Record<EstadoAccidente, string> = {
  esperando_ambulancia: 'esperando ambulancia disponible',
  en_camino: 'ambulancia en camino',
  esperando_hospital: 'esperando hospital con cupo',
  trasladando: 'paciente en traslado',
  resuelto: 'resuelto',
}

function hospitalIcon(estado: Hospital['estado']) {
  const color = estado === 'disponible' ? '#16a34a' : '#dc2626'
  return L.divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.4)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

function ambulanceIcon(estado: EstadoAmbulancia) {
  const opacity = estado === 'disponible' ? 0.55 : 1
  const pulse = estado === 'hacia_accidente' ? 'ambulance-pulse' : ''
  return L.divIcon({
    className: '',
    html: `<div class="${pulse}" style="font-size:22px;line-height:22px;opacity:${opacity}">🚑</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}

const accidentIcon = L.divIcon({
  className: '',
  html: `<div class="accident-pulse" style="font-size:26px;line-height:26px">💥</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
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
      } catch {
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

  const ambulanciaPorId = new Map(estado?.ambulancias.map((a) => [a.id, a]) ?? [])
  const ambulanciaAsignada = estado?.accidente?.ambulanciaId
    ? ambulanciaPorId.get(estado.accidente.ambulanciaId)
    : undefined

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
                  Especialidad: {h.especialidad}
                  <br />
                  Estado: {h.estado}
                </Popup>
              </Marker>
            ))}
            {estado?.ambulancias.map((a) => (
              <Marker key={a.id} position={[a.lat, a.lng]} icon={ambulanceIcon(a.estado)}>
                <Popup>
                  <strong>{a.nombre}</strong>
                  <br />
                  Estado: {AMBULANCIA_LABELS[a.estado]}
                  {a.hospitalDestino && (
                    <>
                      <br />
                      Destino: {a.hospitalDestino}
                    </>
                  )}
                </Popup>
              </Marker>
            ))}
            {estado?.accidente && estado.accidente.estado !== 'resuelto' && (
              <Circle
                center={[estado.accidente.lat, estado.accidente.lng]}
                radius={180}
                pathOptions={{ color: '#dc2626', fillColor: '#dc2626', fillOpacity: 0.15 }}
              />
            )}
            {estado?.accidente && (
              <Marker position={[estado.accidente.lat, estado.accidente.lng]} icon={accidentIcon}>
                <Popup>
                  Accidente — {ACCIDENTE_LABELS[estado.accidente.estado]}
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
        <div className="sidebar">
          <h2>Accidente activo</h2>
          {estado?.accidente ? (
            <div className={`accidente-banner ${estado.accidente.estado}`}>
              <strong>{ACCIDENTE_LABELS[estado.accidente.estado]}</strong>
              <div>Requiere: {estado.accidente.especialistaRequerido}</div>
              {ambulanciaAsignada && <div>Ambulancia: {ambulanciaAsignada.nombre}</div>}
              {estado.accidente.hospitalDestino && (
                <div>Hospital destino: {estado.accidente.hospitalDestino}</div>
              )}
            </div>
          ) : (
            <div className="accidente-banner sin-accidente">Sin accidentes reportados</div>
          )}

          {estado?.accidente && (
            <>
              <h2>Guía de primeros auxilios (IA)</h2>
              <div className="guia-panel">
                <ol>
                  {estado.accidente.guiaPasos.map((paso, i) => (
                    <li
                      key={i}
                      className={
                        i < estado!.accidente!.pasoActual
                          ? 'paso-hecho'
                          : i === estado!.accidente!.pasoActual
                            ? 'paso-actual'
                            : 'paso-pendiente'
                      }
                    >
                      {paso}
                    </li>
                  ))}
                </ol>
                {estado.accidente.siguientePaso && (
                  <div className="paso-sugerido">
                    Siguiente paso sugerido: <strong>{estado.accidente.siguientePaso}</strong>
                  </div>
                )}
              </div>

              <h2>Resumen clínico enviado al hospital</h2>
              <div className="resumen-panel">
                {estado.accidente.resumenClinico.length === 0 ? (
                  <div className="resumen-vacio">Aún sin procedimientos registrados</div>
                ) : (
                  <ul>
                    {estado.accidente.resumenClinico.map((paso, i) => (
                      <li key={i}>{paso}</li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          <h2>Ambulancias</h2>
          {estado?.ambulancias.map((a) => (
            <div key={a.id} className={`ambulancia-card ${a.estado}`}>
              <div className="nombre">{a.nombre}</div>
              <span className={`badge estado-${a.estado}`}>{AMBULANCIA_LABELS[a.estado]}</span>
              {a.hospitalDestino && <div className="destino">→ {a.hospitalDestino}</div>}
            </div>
          ))}

          <h2>Hospitales</h2>
          {estado?.hospitales.map((h) => (
            <div key={h.nombre} className="hospital-card">
              <div className="nombre">{h.nombre}</div>
              Camas libres: {h.camasLibres} · Especialidad: {h.especialidad}
              <span className={`badge ${h.estado}`}>{h.estado.replace('_', ' ')}</span>
            </div>
          ))}

          <h2>Eventos</h2>
          <div className="eventos-log">
            {estado?.eventos.map((e, i) => (
              <div key={i} className="evento">{e}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
