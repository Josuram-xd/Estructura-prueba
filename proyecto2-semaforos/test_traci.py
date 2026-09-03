import traci

sumo_cmd = ["sumo", "-n", "grid.net.xml", "--no-step-log", "true", "--duration-log.disable", "true"]
traci.start(sumo_cmd)

tls_ids = traci.trafficlight.getIDList()
print("Semáforos detectados en la red:", tls_ids)

for step in range(5):
    traci.simulationStep()
    if tls_ids:
        estado = traci.trafficlight.getRedYellowGreenState(tls_ids[0])
        print(f"Paso {step}: estado semáforo {tls_ids[0]} = {estado}")

traci.close()
print("TEST_PASSED: TraCI controló SUMO paso a paso correctamente")
