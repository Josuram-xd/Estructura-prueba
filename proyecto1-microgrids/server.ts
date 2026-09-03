import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

type Device = { id: string; score: number; consumo: number };

// Simulación mínima del MinHeapScheduler
class MinHeapScheduler {
  private heap: Device[] = [];
  push(id: string, score: number, consumo: number) {
    this.heap.push({ id, score, consumo });
    this.heap.sort((a, b) => a.score - b.score);
  }
  pop() {
    return this.heap.shift();
  }
  peekAll() {
    return [...this.heap];
  }
  jitterScores() {
    for (const item of this.heap) {
      const drift = (Math.random() - 0.5) * 1.2;
      item.score = Math.max(0.1, Math.min(10, item.score + drift));
    }
    this.heap.sort((a, b) => a.score - b.score);
  }
  // Reparte el presupuesto disponible empezando por el más urgente (menor score).
  allocate(budgetWatts: number) {
    let remaining = budgetWatts;
    return this.peekAll().map((item) => {
      const alimentado = item.consumo <= remaining;
      if (alimentado) remaining -= item.consumo;
      return { ...item, alimentado };
    });
  }
}

const app = express();
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

const scheduler = new MinHeapScheduler();
scheduler.push("led-critico", 1, 120); // ej. refrigeración/comunicaciones
scheduler.push("led-medio", 5, 60); // ej. iluminación general
scheduler.push("led-bajo", 9, 30); // ej. carga no esencial

const DEMANDA_TOTAL = 120 + 60 + 30;

app.get("/status", (_req, res) => {
  res.json({ heap: scheduler.peekAll() });
});

io.on("connection", (socket) => {
  socket.emit("heap-update", scheduler.allocate(DEMANDA_TOTAL));
});

const PORT = 4001;
httpServer.listen(PORT, () => {
  console.log(`OK: servidor Proyecto 1 escuchando en puerto ${PORT}`);
});

// Simulación en vivo: nubosidad variable afecta generación solar (0-260W,
// alrededor de la demanda total de 210W para que se vea el corte de carga),
// el heap se reordena y el DistributionEngine reparte el presupuesto
// empezando por el dispositivo más urgente.
let t = 0;
setInterval(() => {
  t += 1;
  scheduler.jitterScores();

  const cloudNoise = Math.random() * 90;
  const generated = Math.max(10, 150 + 110 * Math.sin(t / 12) - cloudNoise);

  const allocated = scheduler.allocate(generated);
  const consumedReal = allocated
    .filter((d) => d.alimentado)
    .reduce((sum, d) => sum + d.consumo, 0);

  io.emit("heap-update", allocated);
  io.emit("solar-update", {
    t,
    generated: Math.round(generated),
    consumed: consumedReal,
  });
}, 2000);
