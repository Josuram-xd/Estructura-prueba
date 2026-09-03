# Resultados de pruebas de stack — Estructuras de Datos

Este paquete trae el código ya probado de los 3 proyectos. Instrucciones por proyecto:

## Proyecto 1 — Microgrids (Node.js)
cd proyecto1-microgrids
npm install express typescript socket.io onnxruntime-node --save
npm install --save-dev @types/express @types/node
npx tsc --init --target es2020 --module commonjs --esModuleInterop --outDir dist
npx tsc && node dist/server.js
node test_inference.mjs   # prueba de inferencia ONNX (usa onnxruntime-web si onnxruntime-node falla)

Nota: en el sandbox onnxruntime-node falló por bloqueo a nuget.org. En tu PC con internet normal debería instalar bien.
Si igual falla, usa onnxruntime-web como reemplazo (mismo código, cambia el import).

## Proyecto 2 — Semáforos (Python)
cd proyecto2-semaforos
pip install fastapi "uvicorn[standard]" httpx scikit-learn gymnasium stable-baselines3 traci sumolib
sudo apt-get install sumo sumo-tools sumo-doc   # o instalador de SUMO para tu OS
python3 main.py                # prueba FastAPI
python3 test_ia_opciones.py    # compara Opción A (regresión) vs Opción B (RL/PPO)
python3 test_traci.py          # prueba control de SUMO en tiempo real (necesita SUMO instalado)

## Proyecto 3 — Smart EMS (Java)
cd proyecto3-ems
# Prueba mínima sin Spring Boot (ya validada):
javac src/Main.java -d out && java -cp out Main

# Para el proyecto real con Spring Boot, usa Spring Initializr (start.spring.io)
# con: Java 17, Spring Boot 3.x, dependencias Web + WebSocket + Spring Data JPA + PostgreSQL driver
# En este sandbox Maven Central estaba bloqueado, así que Spring Boot no se pudo probar aquí.
