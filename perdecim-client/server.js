import { createReadStream, existsSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, resolve, sep } from 'node:path'

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
  const filePath = resolve(distDir, `.${requestPath}`)
  return filePath === distDir || filePath.startsWith(`${distDir}${sep}`) ? filePath : null
}

function setSecurityHeaders(response) {
  response.setHeader('Content-Security-Policy', "default-src 'self'; base-uri 'self'; connect-src 'self' https:; font-src 'self' https://fonts.gstatic.com; form-action 'none'; frame-ancestors 'none'; img-src 'self' data: https:; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com")
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('X-Frame-Options', 'DENY')
}

function sendFile(request, response, filePath) {
  response.setHeader('Content-Type', contentTypes[extname(filePath)] ?? 'application/octet-stream')
  if (request.method === 'HEAD') {
    response.end()
    return
  }

  createReadStream(filePath).pipe(response)
}

const server = createServer(async (request, response) => {
  try {
    setSecurityHeaders(response)
    const pathname = new URL(request.url ?? '/', `http://localhost:${port}`).pathname
    if (pathname === '/yonetim' || pathname.startsWith('/yonetim/')) {
      response.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive')
      response.setHeader('Cache-Control', 'no-store')
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.statusCode = 405
      response.setHeader('Allow', 'GET, HEAD')
      response.end('Method Not Allowed')
      return
    }

    const filePath = getFilePath(request.url ?? '/')
    if (!filePath) {
      response.statusCode = 400
      response.end('Bad Request')
      return
    }

    const fileStat = existsSync(filePath) ? await stat(filePath) : null

    if (fileStat?.isFile()) {
      sendFile(request, response, filePath)
      return
    }

    sendFile(request, response, indexPath)
  } catch {
    response.statusCode = 500
    response.end('Internal Server Error')
  }
})

server.listen(port, '0.0.0.0', () => {
  console.log(`Perdecim client listening on port ${port}`)
})
