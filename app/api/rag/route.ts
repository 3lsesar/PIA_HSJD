import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

let documents: Array<{ content: string, metadata: any }> = []
let isInitialized = false

async function preprocessText(text: string): Promise<string> {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function processTextFile(filePath: string): Promise<string> {
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8')
    return preprocessText(content)
  } catch (error) {
    console.error(`Error reading text file ${filePath}:`, error)
    return ''
  }
}

async function processFile(filePath: string): Promise<{ content: string, metadata: any }> {
  const ext = path.extname(filePath).toLowerCase()
  const fileName = path.basename(filePath, ext)
  let content = ''

  if (ext === '.txt') {
    content = await processTextFile(filePath)
  } else {
    console.warn(`Unsupported file type: ${ext} for file ${filePath}`)
    return { content: '', metadata: {} }
  }

  const metadata = {
    fileName: fileName,
    fileType: ext,
    filePath: filePath,
    lastModified: (await fs.promises.stat(filePath)).mtime.toISOString(),
    keywords: fileName.toLowerCase().split(/[-_\s]/).filter(Boolean)
  }

  return { content, metadata }
}

async function processDirectory(dirPath: string): Promise<void> {
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)
      
      if (entry.isDirectory()) {
        await processDirectory(fullPath)
      } else {
        const { content, metadata } = await processFile(fullPath)
        if (content) {
          // Dividir el contenido en chunks de aproximadamente 1000 caracteres
          const chunks = content.match(/.{1,1000}(?:\s|$)/g) || []
          chunks.forEach(chunk => {
            documents.push({
              content: chunk,
              metadata: {
                ...metadata,
                chunk: chunk
              }
            })
          })
        }
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${dirPath}:`, error)
  }
}

async function initialize(): Promise<void> {
  if (isInitialized) return

  console.log('Initializing RAG service...')
  const dataDir = path.join(process.cwd(), 'data')
  await processDirectory(dataDir)
  isInitialized = true
  console.log('RAG service initialized successfully')
}

function findRelevantDocuments(query: string, limit: number = 3): Array<{ content: string, metadata: any }> {
  const queryWords = query.toLowerCase().split(/\s+/)
  
  return documents
    .map(doc => {
      const contentWords = doc.content.toLowerCase().split(/\s+/)
      const metadataWords = doc.metadata.keywords || []
      
      // Calcular relevancia basada en coincidencias de palabras
      const contentMatches = queryWords.filter(word => contentWords.includes(word)).length
      const metadataMatches = queryWords.filter(word => metadataWords.includes(word)).length
      
      return {
        ...doc,
        score: contentMatches + (metadataMatches * 2) // Dar más peso a coincidencias en metadatos
      }
    })
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, limit)
}

export async function POST(req: NextRequest) {
  try {
    if (!isInitialized) {
      await initialize()
    }

    const { query } = await req.json()
    if (!query) {
      return NextResponse.json({ error: 'Invalid query' }, { status: 400 })
    }

    const results = findRelevantDocuments(query)
    const context = results.map((doc) => {
      const source = doc.metadata.fileName
      return `[Fuente: ${source}]\n${doc.content}`
    }).join('\n\n')

    return NextResponse.json({ context })
  } catch (error: any) {
    console.error('Error in RAG API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
} 