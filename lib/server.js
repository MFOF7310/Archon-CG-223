'use strict'
const http = require('http')
const fs = require('fs-extra')
const path = require('path')
const { default: makeWASocket, useMultiFileAuthState,
        DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')
const pino = require('pino')
const QRCode = require('qrcode')

const SESSION_DIR = path.join(__dirname, '..', 'session')
const TOKENS = new Map() // token → { status, qr, pairingCode, sessionId, phone, sock }

function generateToken() {
  return require('crypto').randomBytes(16).toString('hex')
}

function generateSessionId() {
  return 'archon_' + require('crypto').randomBytes(8).toString('hex')
}

async function createBaileysSocket(sessionPath, phone = null) {
  await fs.ensureDir(sessionPath)
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    browser: ['Ubuntu', 'Chrome', '22.0.0'],
    syncFullHistory: false,
    generateHighQualityLinkPreview: false,
  })

  sock.ev.on('creds.update', saveCreds)
  return { sock, saveCreds }
}

async function startQRFlow(token) {
  const entry = TOKENS.get(token)
  if (!entry) return

  const sessionPath = path.join(SESSION_DIR, 'pending', token)
  await fs.ensureDir(sessionPath)

  const { sock } = await createBaileysSocket(sessionPath)
  entry.sock = sock

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      try {
        const qrImage = await QRCode.toDataURL(qr)
        entry.qrCode = qrImage
        entry.status = 'awaiting_scan'
        TOKENS.set(token, entry)
      } catch {}
    }

    if (connection === 'open') {
      const sessionId = generateSessionId()
      const finalPath = path.join(SESSION_DIR, sessionId)
      await fs.move(sessionPath, finalPath, { overwrite: true })

      entry.status = 'ready'
      entry.sessionId = sessionId
      entry.phone = sock.user?.id?.split(':')[0] || ''
      TOKENS.set(token, entry)

      // Copy to main session dir
      await fs.copy(finalPath, SESSION_DIR, { overwrite: false, filter: (src) => src.endsWith('creds.json') || src === finalPath })
    }

    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode
      if (reason === DisconnectReason.loggedOut || entry.status === 'ready') return
      entry.status = 'error'
      entry.error = 'Connection closed'
      TOKENS.set(token, entry)
    }
  })
}

async function startPairingFlow(token, phoneNumber) {
  const entry = TOKENS.get(token)
  if (!entry) return

  const sessionPath = path.join(SESSION_DIR, 'pending', token)
  await fs.ensureDir(sessionPath)

  const { sock } = await createBaileysSocket(sessionPath, phoneNumber)
  entry.sock = sock

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    console.log('[ARCHON-PAIR] connection.update:', connection, lastDisconnect?.error?.message || '')
    if (connection === 'open') {
      const sessionId = generateSessionId()
      const finalPath = path.join(SESSION_DIR, sessionId)

      // Copy creds.json to main session dir immediately
      const credsSource = path.join(sessionPath, 'creds.json')
      const credsDest = path.join(SESSION_DIR, 'creds.json')
      if (await fs.pathExists(credsSource)) {
        await fs.copy(credsSource, credsDest, { overwrite: true })
        console.log('[ARCHON] Session creds copied to main session dir ✓')
      }

      // Move pending to named session folder
      await fs.move(sessionPath, finalPath, { overwrite: true })

      entry.status = 'ready'
      entry.sessionId = sessionId
      entry.phone = sock.user?.id?.split(':')[0] || ''
      entry.fullSession = sessionId
      TOKENS.set(token, entry)
      console.log('[ARCHON] Session ready:', sessionId)
    }

    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode
      if (entry.status === 'ready') return
      entry.status = 'error'
      entry.error = 'Connection closed: ' + reason
      TOKENS.set(token, entry)
    }
  })

  // Request pairing code after 3s
  setTimeout(async () => {
    try {
      const suffix = Math.floor(Math.random() * 100).toString().padStart(2, '0')
      const customCode = 'BAMAKO' + suffix
      const code = await sock.requestPairingCode(phoneNumber, customCode)
      entry.pairingCode = code
      entry.status = 'awaiting_scan'
      TOKENS.set(token, entry)
    } catch (err) {
      entry.status = 'error'
      entry.error = err.message
      TOKENS.set(token, entry)
    }
  }, 3000)
}

function parseBody(req) {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', chunk => data += chunk)
    req.on('end', () => {
      try { resolve(JSON.parse(data)) } catch { resolve({}) }
    })
  })
}

function startServer(port = 5002) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`)
    const p = url.pathname
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Access-Control-Allow-Origin', '*')

    try {
      // GET /api/whatsapp/session
      if (req.method === 'GET' && p === '/api/whatsapp/session') {
        const credsPath = path.join(SESSION_DIR, 'creds.json')
        const connected = await fs.pathExists(credsPath)
        res.writeHead(200)
        return res.end(JSON.stringify({ connected, status: connected ? 'ready' : 'disconnected' }))
      }

      // GET /api/whatsapp/status
      if (req.method === 'GET' && p === '/api/whatsapp/status') {
        const credsPath = path.join(SESSION_DIR, 'creds.json')
        const connected = await fs.pathExists(credsPath)
        res.writeHead(200)
        return res.end(JSON.stringify({ connected, status: connected ? 'ready' : 'disconnected' }))
      }

      // POST /api/whatsapp/qr
      if (req.method === 'POST' && p === '/api/whatsapp/qr') {
        const token = generateToken()
        TOKENS.set(token, { status: 'starting', qrCode: null, pairingCode: null, sessionId: null, phone: '' })
        startQRFlow(token).catch(err => {
          const e = TOKENS.get(token)
          if (e) { e.status = 'error'; e.error = err.message; TOKENS.set(token, e) }
        })
        res.writeHead(200)
        return res.end(JSON.stringify({ token }))
      }

      // GET /api/whatsapp/qr/poll/:token
      const qrPollMatch = p.match(/^\/api\/whatsapp\/qr\/poll\/(.+)$/)
      if (req.method === 'GET' && qrPollMatch) {
        const entry = TOKENS.get(qrPollMatch[1])
        if (!entry) { res.writeHead(404); return res.end(JSON.stringify({ error: 'Token not found' })) }
        res.writeHead(200)
        return res.end(JSON.stringify({
          status: entry.status,
          qrCode: entry.qrCode || null,
          sessionId: entry.sessionId || null,
          phone: entry.phone || null,
          error: entry.error || null,
        }))
      }

      // POST /api/whatsapp/create (pairing code)
      if (req.method === 'POST' && p === '/api/whatsapp/create') {
        const body = await parseBody(req)
        const phoneNumber = (body.phoneNumber || '').replace(/[^0-9]/g, '')
        if (!phoneNumber || phoneNumber.length < 8) {
          res.writeHead(400)
          return res.end(JSON.stringify({ error: 'Invalid phone number' }))
        }
        const token = generateToken()
        TOKENS.set(token, { status: 'starting', pairingCode: null, sessionId: null, phone: phoneNumber })
        startPairingFlow(token, phoneNumber).catch(err => {
          const e = TOKENS.get(token)
          if (e) { e.status = 'error'; e.error = err.message; TOKENS.set(token, e) }
        })
        res.writeHead(200)
        return res.end(JSON.stringify({ token }))
      }

      // GET /api/whatsapp/poll/:token (pairing poll)
      const pollMatch = p.match(/^\/api\/whatsapp\/poll\/(.+)$/)
      if (req.method === 'GET' && pollMatch) {
        const entry = TOKENS.get(pollMatch[1])
        if (!entry) { res.writeHead(404); return res.end(JSON.stringify({ error: 'Token not found' })) }
        res.writeHead(200)
        return res.end(JSON.stringify({
          status: entry.status,
          pairingCode: entry.pairingCode || null,
          code: entry.pairingCode || null,
          sessionId: entry.sessionId || null,
          phone: entry.phone || null,
          error: entry.error || null,
        }))
      }

      // DELETE /api/whatsapp/session/:token
      const deleteMatch = p.match(/^\/api\/whatsapp\/session\/(.+)$/)
      if (req.method === 'DELETE' && deleteMatch) {
        const entry = TOKENS.get(deleteMatch[1])
        if (entry?.sock) {
          try { await entry.sock.logout() } catch {}
        }
        TOKENS.delete(deleteMatch[1])
        res.writeHead(200)
        return res.end(JSON.stringify({ success: true }))
      }

      // DELETE /api/whatsapp/session (main)
      if (req.method === 'DELETE' && p === '/api/whatsapp/session') {
        await fs.emptyDir(SESSION_DIR)
        res.writeHead(200)
        return res.end(JSON.stringify({ success: true }))
      }

      // GET /api/whatsapp/fetch/:sessionId
      const fetchMatch = p.match(/^\/api\/whatsapp\/fetch\/(.+)$/)
      if (req.method === 'GET' && fetchMatch) {
        const credsPath = path.join(SESSION_DIR, 'creds.json')
        if (!await fs.pathExists(credsPath)) {
          res.writeHead(404)
          return res.end(JSON.stringify({ error: 'Session not found' }))
        }
        const creds = await fs.readJson(credsPath)
        res.writeHead(200)
        return res.end(JSON.stringify({ success: true, data: { creds } }))
      }

      // GET /health
      if (req.method === 'GET' && p === '/health') {
        res.writeHead(200)
        return res.end(JSON.stringify({ ok: true }))
      }

      res.writeHead(404)
      res.end(JSON.stringify({ error: 'Not found' }))

    } catch (err) {
      console.error('[ARCHON] Server error:', err.message)
      res.writeHead(500)
      res.end(JSON.stringify({ error: 'Internal server error' }))
    }
  })

  server.listen(port, '127.0.0.1', () => {
    console.log(`[ARCHON] API server listening on port ${port}`)
  })
  return server
}

module.exports = { startServer }
