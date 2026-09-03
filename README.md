# Estructura-prueba

Prototipos de 3 proyectos de la materia **Estructuras de Datos**, cada uno probando en código real el stack propuesto en [`propuesta-original.md`](./propuesta-original.md):

1. **Microgrids** — balanceo de carga solar con min-heap (Node.js + TypeScript + ONNX)
2. **Semáforos** — optimización de intersecciones con grafo/cola de prioridad (Python + FastAPI + SUMO)
3. **Smart EMS** — coordinación de ambulancias/hospitales con min-heap (Java)

> Estos son *smoke tests* del stack, no las apps finales: confirman que cada pieza clave (heap, inferencia ONNX, RL, TraCI, PriorityQueue) corre en el entorno elegido antes de construir el sistema completo.

Verificado en Windows 11 con Node 24, Python 3.12, JDK 24, SUMO 1.27.1.

## Requisitos

- [Node.js](https://nodejs.org/) 20+ y npm
- [Python](https://www.python.org/) 3.11+ y pip
- JDK 17+ (usado: JDK 24)
- [SUMO](https://sumo.dlr.de/) (Eclipse SUMO) — solo para la prueba de TraCI del proyecto 2

Los comandos abajo están en sintaxis de **PowerShell** (no uses `&&` entre líneas; PowerShell 5.1 no lo soporta — pega cada línea o usa `;`).

## Proyecto 1 — Microgrids (`proyecto1-microgrids/`)

Stack: Node.js + Express + Socket.io + TypeScript + ONNX Runtime Web. Frontend: React + TypeScript + Recharts.

Backend (puerto 4001, corre indefinidamente con simulación en vivo de nubosidad/heap):

```powershell
cd proyecto1-microgrids
npm install
npx tsc
node dist/server.js
```

Frontend (puerto 5173 por defecto), en otra terminal:

```powershell
cd proyecto1-microgrids/frontend
npm install
npm run dev
```

Muestra el heap de dispositivos reordenándose en vivo (rojo/amarillo/verde por urgencia) y una gráfica de energía generada vs. consumida, ambos vía Socket.io.

Prueba de inferencia del modelo solar (`solar_model.onnx`, entrenado con `train_solar_model.py`):

```powershell
cd proyecto1-microgrids
node test_inference.mjs
```

## Proyecto 2 — Semáforos (`proyecto2-semaforos/`)

Stack: Python + FastAPI + scikit-learn + Gymnasium/Stable-Baselines3 (RL) + SUMO/TraCI. Frontend: React + TypeScript + `@xyflow/react` (React Flow).

```powershell
cd proyecto2-semaforos
pip install fastapi "uvicorn[standard]" httpx scikit-learn gymnasium stable-baselines3 traci sumolib
python test_ia_opciones.py
```

Servidor en vivo (puerto 8010, WebSocket en `/ws` con congestión simulada cada 1.5s):

```powershell
cd proyecto2-semaforos
python main.py
```

Frontend (puerto 5173 por defecto), en otra terminal:

```powershell
cd proyecto2-semaforos/frontend
npm install
npm run dev
```

Muestra el grafo de la intersección (4 carriles → nodo central) con el grosor de cada arista según congestión y el carril con luz verde resaltado en tiempo real.

Prueba de control en tiempo real vía TraCI (requiere [SUMO instalado](https://sumo.dlr.de/docs/Downloads.php), ej. `winget install --id EclipseFoundation.SUMO -e`):

```powershell
$env:PATH = "C:\Program Files (x86)\Eclipse\Sumo\bin;" + $env:PATH
$env:SUMO_HOME = "C:\Program Files (x86)\Eclipse\Sumo"
python test_traci.py
```

Nota: `grid.net.xml` es una red de prueba genérica sin semáforos (TLS) configurados; el test confirma que la conexión TraCI↔SUMO funciona, pero para ver un semáforo real regenera la red con `netgenerate --tls.guess` o usa una intersección con TLS.

## Proyecto 3 — Smart EMS (`proyecto3-ems/`)

Stack: Java puro (versión mínima sin Spring Boot). El proyecto real usaría Java 17 + Spring Boot 3.x (Web + WebSocket + Spring Data JPA + PostgreSQL). Frontend: React + TypeScript + Leaflet.

Prueba de consola del min-heap de hospitales:

```powershell
cd proyecto3-ems
javac src\Main.java -d out
java -cp out Main
```

Si tienes más de un JDK instalado y `java`/`javac` no coinciden en versión, usa la ruta completa, por ejemplo:

```powershell
& "C:\Program Files\Java\jdk-24\bin\javac" src\Main.java -d out
& "C:\Program Files\Java\jdk-24\bin\java" -cp out Main
```

Servidor en vivo para el frontend (`ApiServer.java`, sin dependencias externas — usa `com.sun.net.httpserver` del propio JDK, puerto 8082, endpoint `GET /api/state` con polling):

```powershell
cd proyecto3-ems
& "C:\Program Files\Java\jdk-24\bin\javac" src\Main.java src\ApiServer.java -d out
& "C:\Program Files\Java\jdk-24\bin\java" -cp out ApiServer
```

Frontend (puerto 5173 por defecto), en otra terminal:

```powershell
cd proyecto3-ems/frontend
npm install
npm run dev
```

Muestra un mapa de Pasto (tiles OpenStreetMap, sin API key) con los 3 hospitales (verde/rojo según cupo), la ambulancia moviéndose entre puntos, y un panel con el hospital elegido por el min-heap en vivo — incluye el escenario de "hospital sin cupo" cada ~16s para ver la reasignación automática.

## Modelos de IA: propios vs. API

Para no depender de internet ni de costos de API durante una sustentación, cada proyecto usa un **modelo propio entrenado localmente** (regresión/Random Forest exportado a ONNX, o política de RL guardada) para la decisión de IA, y solo consume APIs externas gratuitas y sin llave (Open-Meteo, OpenStreetMap/OSRM) para datos crudos en tiempo real — nunca para la inferencia en sí.
