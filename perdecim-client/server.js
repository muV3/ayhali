import { createReadStream, existsSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'

const port = Number.parseInt(process.env.PORT ?? '4173', 10)
const distDir = resolve('dist')
const indexPath = join(distDir, 'index.html')

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}

function getFilePath(url) {
  const requestPath = decodeURIComponent(new URL(url, `http://localhost:${port}`).pathname)
  const normalizedPath = normalize(requestPath).replace(/^(\.\.[/\\])+/, '')
  return join(distDir, normalizedPath)
}

function sendFile(response, filePath) {
  response.setHeader('Content-Type', contentTypes[extname(filePath)] ?? 'application/octet-stream')
  createReadStream(filePath).pipe(response)
}

const server = createServer(async (request, response) => {
  try {
    const filePath = getFilePath(request.url ?? '/')
    const fileStat = existsSync(filePath) ? await stat(filePath) : null

    if (fileStat?.isFile()) {
      sendFile(response, filePath)
      return
    }

    sendFile(response, indexPath)
  } catch {
    response.statusCode = 500
    response.end('Internal Server Error')
  }
})

server.listen(port, '0.0.0.0', () => {
  console.log(`Perdecim client listening on port ${port}`)
})
