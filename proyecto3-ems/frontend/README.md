# Frontend — Smart EMS Pasto

React + TypeScript + Leaflet. Muestra en un mapa de Pasto la ambulancia moviéndose, los hospitales (verde = disponible, rojo = sin cupo) y el hospital elegido por el min-heap del backend, actualizando cada 1.5s por polling HTTP.

Backend: `../src/ApiServer.java` (servidor HTTP mínimo con `com.sun.net.httpserver`, sin dependencias externas, puerto **8082**). Simula: la ambulancia avanza cada ~2s por 3 waypoints cerca de Pasto, y cada ~16s un hospital pierde y recupera su cupo para forzar la reasignación.

## Correr (PowerShell, en dos ventanas separadas)

**Ventana 1 — backend:**
```powershell
cd F:\Sho\Estructura-prueba\proyecto3-ems
& "C:\Program Files\Java\jdk-24\bin\javac" src\Main.java src\ApiServer.java -d out
& "C:\Program Files\Java\jdk-24\bin\java" -cp out ApiServer
```

**Ventana 2 — frontend:**
```powershell
cd F:\Sho\Estructura-prueba\proyecto3-ems\frontend
npm install
npm run dev
```

Abre `http://localhost:5173`. Si el panel superior dice "No se pudo conectar al ApiServer en :8082", confirma que la ventana 1 sigue corriendo.
