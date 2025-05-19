#pip install pymupdf pytesseract pdf2image sentence-transformers faiss-cpu openpyxl

import fitz
from pdf2image import convert_from_path
import pytesseract
import openpyxl
import pickle
import os
from pathlib import Path
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np

#Modelo de embeddings
model = SentenceTransformer("all-MiniLM-L6-v2")

def extraer_texto_pdf(path):
    doc = fitz.open(path)
    texto = ""
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        page_text = page.get_text().strip()
        if len(page_text) < 20:  # Si hay poco texto, hacemos OCR
            print(f"Página {page_num+1} con poco texto, aplicando OCR...")
            images = convert_from_path(path, first_page=page_num+1, last_page=page_num+1)
            ocr_text = pytesseract.image_to_string(images[0], lang='spa')
            texto += ocr_text + "\n"
        else:
            texto += page_text + "\n"
    return texto

def leer_casos_excel(path):
    wb = openpyxl.load_workbook(path)
    sheet = wb.active
    casos = []
    for row in sheet.iter_rows(min_row=2, values_only=True):  # saltamos encabezado
        casos.append(" ".join([str(cell) for cell in row if cell is not None]))
    return casos

def chunk_text(text, chunk_size=500, overlap=100):
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks

def generar_indice(textos):
    embeddings = model.encode(textos)
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(np.array(embeddings))
    return index, embeddings

# Procesar PDFs
def procesar_pdfs(carpeta_pdf):
    textos = []
    for pdf_file in Path(carpeta_pdf).glob("*.pdf"):
        print(f"Procesando {pdf_file}...")
        texto = extraer_texto_pdf(str(pdf_file))
        textos.extend(chunk_text(texto))
    return textos

# Procesar Excel
def procesar_excel(path_excel):
    casos = leer_casos_excel(path_excel)
    textos = []
    for caso in casos:
        textos.extend(chunk_text(caso))
    return textos

# Carga índice y textos
indice = faiss.read_index("indice.faiss")
with open("textos.pkl", "rb") as f:
    textos = pickle.load(f)

def buscar_contexto(pregunta, top_k=3):
    emb = model.encode([pregunta])
    D, I = indice.search(np.array(emb), top_k)
    return [textos[i] for i in I[0]]

def construir_prompt(pregunta):
    contexto = buscar_contexto(pregunta)
    contexto_texto = "\n\n".join(contexto)
    prompt = f"Usa el siguiente contexto para responder:\n\n{contexto_texto}\n\nPregunta: {pregunta}\nRespuesta:"
    return prompt

from llama_cpp import Llama

llm = Llama(model_path="ruta/al/modelo.gguf", n_ctx=2048)

def responder(pregunta):
    prompt = construir_prompt(pregunta)
    salida = llm(prompt, max_tokens=300, stop=["\n"])
    return salida['choices'][0]['text'].strip()

# Ejemplo:
print(responder("¿Qué casos similares hay sobre el tema X?"))



# Combinar todo y crear índice FAISS
pdf_texts = procesar_pdfs("carpeta_pdfs")
excel_texts = procesar_excel("casos.xlsx")
todos_textos = pdf_texts + excel_texts

indice, embeddings = generar_indice(todos_textos)
faiss.write_index(indice, "indice.faiss")

# Guarda también los textos para recuperar contexto luego

with open("textos.pkl", "wb") as f:
    pickle.dump(todos_textos, f)
