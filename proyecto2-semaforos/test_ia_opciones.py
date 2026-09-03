import time
import numpy as np

print("=== Opción A: Regresión (scikit-learn) ===")
from sklearn.linear_model import LinearRegression
rng = np.random.default_rng(1)
ocupacion = rng.uniform(0, 100, 300).reshape(-1, 1)
tiempo_verde = np.clip(10 + ocupacion.flatten() * 0.6, 10, 90)
t0 = time.time()
reg = LinearRegression().fit(ocupacion, tiempo_verde)
print(f"OK regresión entrenada en {time.time()-t0:.3f}s | R2={reg.score(ocupacion, tiempo_verde):.3f}")
print("Predicción para 80% de ocupación:", reg.predict([[80]])[0], "segundos de luz verde")

print("\n=== Opción B: Reinforcement Learning (Gymnasium + PPO) ===")
import gymnasium as gym
from stable_baselines3 import PPO

env = gym.make("CartPole-v1")  # entorno estándar de prueba, no el de tráfico real
t0 = time.time()
model = PPO("MlpPolicy", env, verbose=0, n_steps=64, batch_size=32)
model.learn(total_timesteps=256)
print(f"OK modelo PPO entrenado (mini smoke test) en {time.time()-t0:.2f}s")

obs, _ = env.reset()
action, _ = model.predict(obs)
print("Acción predicha por el agente:", action)
print("\nTEST_PASSED: ambas opciones de IA corren en este entorno")
