import numpy as np
from sklearn.linear_model import LinearRegression
from skl2onnx import to_onnx

# Datos sintéticos: [hora_del_dia, nubosidad_pct] -> irradiancia_estimada
rng = np.random.default_rng(42)
horas = rng.uniform(6, 18, 500)
nubosidad = rng.uniform(0, 100, 500)
irradiancia = np.clip(800 * np.sin((horas - 6) / 12 * np.pi) * (1 - nubosidad / 120), 0, None)

X = np.column_stack([horas, nubosidad]).astype(np.float32)
y = irradiancia.astype(np.float32)

model = LinearRegression()
model.fit(X, y)
print("R^2 en datos de entrenamiento:", model.score(X, y))

onx = to_onnx(model, X[:1])
with open("/home/claude/proyecto1-microgrids/solar_model.onnx", "wb") as f:
    f.write(onx.SerializeToString())
print("OK: modelo exportado a solar_model.onnx")
