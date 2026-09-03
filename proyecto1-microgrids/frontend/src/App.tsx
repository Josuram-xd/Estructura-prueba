import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "./App.css";

type Device = { id: string; score: number; consumo: number; alimentado: boolean };
type EnergyPoint = { t: number; generated: number; consumed: number };

const SERVER_URL = "http://localhost:4001";
const MAX_POINTS = 30;

function tierColor(score: number): string {
  if (score < 3) return "#e5484d";
  if (score < 7) return "#f5a524";
  return "#30a46c";
}

function tierLabel(score: number): string {
  if (score < 3) return "crítico";
  if (score < 7) return "medio";
  return "bajo";
}

function skyState(generated: number): { label: string; icon: string } {
  if (generated > 190) return { label: "despejado", icon: "☀️" };
  if (generated > 100) return { label: "parcialmente nublado", icon: "⛅" };
  return { label: "nublado", icon: "☁️" };
}

export default function App() {
  const [heap, setHeap] = useState<Device[]>([]);
  const [energy, setEnergy] = useState<EnergyPoint[]>([]);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  useEffect(() => {
    const socket = io(SERVER_URL);
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("heap-update", (data: Device[]) => {
      setHeap([...data].sort((a, b) => a.score - b.score));
    });

    socket.on("solar-update", (point: EnergyPoint) => {
      setEnergy((prev) => [...prev, point].slice(-MAX_POINTS));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const last = energy[energy.length - 1];
  const sky = skyState(last?.generated ?? 0);
  const balance = last ? last.generated - last.consumed : 0;
  const conteo = { critico: 0, medio: 0, bajo: 0 };
  for (const d of heap) conteo[tierLabel(d.score) as "critico" | "medio" | "bajo"]++;

  return (
    <div className="app">
      <header>
        <h1>Proyecto 1 — Microgrids Solares</h1>
        <span className={`status ${connected ? "ok" : "down"}`}>
          {connected ? "conectado" : "desconectado"}
        </span>
      </header>

      <section className="stats">
        <div className="stat-card">
          <span className="stat-label">Generación</span>
          <span className="stat-value">{last?.generated ?? "—"} W</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Consumo real</span>
          <span className="stat-value">{last?.consumed ?? "—"} W</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Excedente</span>
          <span className="stat-value" style={{ color: balance >= 0 ? "#30a46c" : "#e5484d" }}>
            {last ? `${balance >= 0 ? "+" : ""}${balance} W` : "—"}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Cielo (simulado)</span>
          <span className="stat-value">
            {sky.icon} {sky.label}
          </span>
        </div>
      </section>

      <section className="panel">
        <h2>MinHeapScheduler — orden de atención</h2>
        <p className="hint">
          {conteo.critico} crítico · {conteo.medio} medio · {conteo.bajo} bajo — el heap siempre
          reparte el presupuesto disponible empezando por el score más bajo (más urgente).
        </p>
        <ul className="heap-list">
          {heap.map((device) => (
            <li key={device.id} style={{ borderLeftColor: tierColor(device.score) }}>
              <span className="device-id">{device.id}</span>
              <span className="device-tier" style={{ color: tierColor(device.score) }}>
                {tierLabel(device.score)}
              </span>
              <span className="device-score">score {device.score.toFixed(2)}</span>
              <span className="device-score">{device.consumo} W</span>
              <span className={`badge ${device.alimentado ? "" : "off"}`}>
                {device.alimentado ? "⚡ recibiendo energía" : "⏸ en espera"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>Generación vs. consumo</h2>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={energy}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="t" tick={{ fill: "#aaa" }} />
            <YAxis tick={{ fill: "#aaa" }} />
            <Tooltip contentStyle={{ background: "#1c1c1c", border: "1px solid #444" }} />
            <Legend />
            <Area
              type="monotone"
              dataKey="generated"
              name="Generado (W)"
              stroke="#30a46c"
              fill="#30a46c33"
            />
            <Area
              type="monotone"
              dataKey="consumed"
              name="Consumido (W)"
              stroke="#e5484d"
              fill="#e5484d33"
            />
          </AreaChart>
        </ResponsiveContainer>
      </section>

      <section className="panel legend">
        <h2>Cómo leer esto</h2>
        <p>
          Cada 2s el simulador cambia la nubosidad y recalcula cuánto genera el panel solar. El{" "}
          <strong>MinHeapScheduler</strong> reordena los dispositivos por urgencia y el{" "}
          <strong>DistributionEngine</strong> reparte lo generado empezando por el más urgente —
          si no alcanza para todos, los de menor prioridad quedan "en espera" hasta que vuelva a
          haber excedente.
        </p>
        <ul className="legend-tiers">
          <li>
            <span className="dot" style={{ background: "#e5484d" }} /> crítico — score &lt; 3 (ej.
            refrigeración, comunicaciones)
          </li>
          <li>
            <span className="dot" style={{ background: "#f5a524" }} /> medio — score 3–7 (ej.
            iluminación)
          </li>
          <li>
            <span className="dot" style={{ background: "#30a46c" }} /> bajo — score &gt; 7 (carga
            no esencial)
          </li>
        </ul>
      </section>
    </div>
  );
}
