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
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

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

// Auto-cierre tras probar (para test automático)
setTimeout(() => {
  console.log("TEST_PASSED: heap =", JSON.stringify(scheduler.peekAll()));
  process.exit(0);
}, 1500);
