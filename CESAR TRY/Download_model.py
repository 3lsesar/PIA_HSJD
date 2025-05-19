import os
import subprocess
import sys
from transformers import AutoModelForCausalLM, AutoTokenizer
from llama_cpp import Llama
from Install_llama import start, run

start()

# Paso 4: Descargar el modelo desde Hugging Face
modelo_id = "TheBloke/Mistral-7B-Instruct-v0.2-GGUF"
directorio_modelo = "models/mistral"
os.makedirs(directorio_modelo, exist_ok=True)

print("\n🔽 Descargando el modelo desde Hugging Face...")
# Descargamos el modelo y el tokenizador
model = AutoModelForCausalLM.from_pretrained(modelo_id, revision="main", use_cache=True)
tokenizer = AutoTokenizer.from_pretrained(modelo_id, revision="main")

# Guardar modelo y tokenizador
model.save_pretrained(directorio_modelo)
tokenizer.save_pretrained(directorio_modelo)
print(f"📂 Modelo descargado y guardado en {directorio_modelo}")

# Paso 5: Usar el modelo con llama.cpp en Python
print("\n🔧 Cargando el modelo con llama.cpp...")

llama = Llama(
    model_path="models/mistral/mistral-7b-instruct-v0.2.Q4_K_M.gguf",  # Ruta a tu archivo .gguf
    n_ctx=2048,
    n_threads=8,  # Ajusta según tu CPU
    n_gpu_layers=0  # Usar solo CPU
)

# Paso 6: Preguntar al modelo
pregunta = "¿Cuál es la capital de Francia?"
respuesta = llama(pregunta, max_tokens=100)

print("\n📝 Pregunta:", pregunta)
print("Respuesta del modelo:", respuesta["choices"][0]["text"].strip())
