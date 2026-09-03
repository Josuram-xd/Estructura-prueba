import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

// Simulación mínima del MinHeapScheduler
class MinHeapScheduler {
  private heap: { id: string; score: number }[] = [];
  push(id: string, score: number) {
    this.heap.push({ id, score });
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
}

const app = express();
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

const scheduler = new MinHeapScheduler();
scheduler.push("led-critico", 1);
scheduler.push("led-medio", 5);
scheduler.push("led-bajo", 9);

app.get("/status", (_req, res) => {
  res.json({ heap: scheduler.peekAll() });
});

io.on("connection", (socket) => {
  socket.emit("heap-update", scheduler.peekAll());
});

const PORT = 4001;
httpServer.listen(PORT, () => {
  console.log(`OK: servidor Proyecto 1 escuchando en puerto ${PORT}`);
});

// Simulación en vivo: nubosidad variable afecta generación solar; el heap
// se reordena periódicamente como lo haría con dispositivos reales.
let t = 0;
setInterval(() => {
  t += 1;
  scheduler.jitterScores();
  io.emit("heap-update", scheduler.peekAll());

  const cloudNoise = Math.random() * 120;
  const generated = Math.max(
    0,
    500 + 400 * Math.sin(t / 10) - cloudNoise
  );
  const consumed = 350 + Math.random() * 150;
  io.emit("solar-update", { t, generated: Math.round(generated), consumed: Math.round(consumed) });
}, 2000);
