# Frontend — Proyecto 2 Semáforos

React + TypeScript + Vite + `@xyflow/react`, conectado por WebSocket al backend FastAPI.

## Correr (PowerShell, dos terminales)

Terminal 1 — backend (puerto 8010):

```powershell
cd F:\Sho\Estructura-prueba\proyecto2-semaforos
python main.py
```

Terminal 2 — frontend (puerto 5173):

```powershell
cd F:\Sho\Estructura-prueba\proyecto2-semaforos\frontend
npm install
npm run dev
```

Abre http://localhost:5173 — verás el grafo de la intersección con los 4 carriles, la congestión actualizándose cada 1.5s vía `ws://localhost:8010/ws`, y el carril con luz verde resaltado en verde.
