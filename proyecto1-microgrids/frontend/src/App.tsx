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

type Device = { id: string; score: number };
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

  return (
    <div className="app">
      <header>
        <h1>Proyecto 1 — Microgrids Solares</h1>
        <span className={`status ${connected ? "ok" : "down"}`}>
          {connected ? "conectado" : "desconectado"}
        </span>
      </header>

      <section className="panel">
        <h2>MinHeapScheduler — orden de atención</h2>
        <ul className="heap-list">
          {heap.map((device, idx) => (
            <li
              key={device.id}
              className={idx === 0 ? "top" : ""}
              style={{ borderLeftColor: tierColor(device.score) }}
            >
              <span className="device-id">{device.id}</span>
              <span className="device-tier" style={{ color: tierColor(device.score) }}>
                {tierLabel(device.score)}
              </span>
              <span className="device-score">score {device.score.toFixed(2)}</span>
              {idx === 0 && <span className="badge">recibiendo energía</span>}
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
    </div>
  );
}
