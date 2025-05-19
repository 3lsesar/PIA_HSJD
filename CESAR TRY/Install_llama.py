import subprocess
import os
import sys

def run(command, cwd=None):
    print(f"\n📦 Ejecutando: {' '.join(command)}")
    try:
        subprocess.run(command, check=True, cwd=cwd)
    except subprocess.CalledProcessError as e:
        print(f"❌ Error ejecutando: {' '.join(command)}")
        sys.exit(1)

def start():
    print("🚀 Iniciando el script...")
    # Carpeta destino del proyecto
    BASE_DIR = os.path.abspath("llama.cpp")
    BUILD_DIR = os.path.join(BASE_DIR, "build")
    MAIN_EXE = os.path.join(BUILD_DIR, "bin", "Release", "main.exe")

    # Paso 0: Clonar llama.cpp si no existe
    if not os.path.exists(BASE_DIR):
        print("🐑 Clonando llama.cpp desde GitHub...")
        run(["git", "clone", "https://github.com/ggerganov/llama.cpp"])
    else:
        print("📂 El repositorio llama.cpp ya existe.")

    # Paso 1: CMake para preparar build (CPU)

    print("🖥️ Compilando para CPU...")
    run(["cmake", "-B", BUILD_DIR, "-DLLAMA_CURL=OFF", "-DLLAMA_CUBLAS=OFF"], cwd=BASE_DIR)


    # Paso 2: Compilar en modo Release
    run(["cmake", "--build", BUILD_DIR, "--config", "Release"], cwd=BASE_DIR)

    # Paso 3: Verificar binario
    if os.path.exists(MAIN_EXE):
        print(f"\n✅ ¡Compilado con éxito! Binario creado en:\n   {MAIN_EXE}")
    else:
        print("⚠️ Compilación terminada, pero no se encontró main.exe")

start()