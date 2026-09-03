# Frontend — Microgrids Solares

React + TypeScript + Recharts, conectado por Socket.io al backend en `../server.ts`.

## Correr (PowerShell — pega cada línea por separado, sin `&&`)

Terminal 1 — backend (puerto 4001):

```powershell
cd F:\Sho\Estructura-prueba\proyecto1-microgrids
npx tsc
node dist/server.js
```

Terminal 2 — frontend (puerto 5173):

```powershell
cd F:\Sho\Estructura-prueba\proyecto1-microgrids\frontend
npm install
npm run dev
```

Abre `http://localhost:5173`. Verás la lista de dispositivos reordenándose cada 2s según su score de urgencia (el de menor score queda marcado "recibiendo energía"), y una gráfica de generación vs. consumo solar actualizándose en vivo.
