'use strict'
const { default: makeWASocket, useMultiFileAuthState,
        DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')
const pino = require('pino')
const { fetchSession, clearSession, SESSION_DIR } = require('./session')
const { loadPlugins } = require('./utils')
const { serialize } = require('./serialize')

let sock = null
let retries = 0
const MAX_RETRIES = 5

async function startConnection(config) {
  const sessionDir = await fetchSession(config.SESSION_ID, config.SESSION_API)

  // No session yet — poll every 10s until dashboard connects one
  if (!sessionDir) {
    console.log('[ARCHON] Waiting for session... retrying in 10s')
    setTimeout(() => startConnection(config), 10000)
    return
  }

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR)
  const { version } = await fetchLatestBaileysVersion()
  const plugins = await loadPlugins()

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    browser: ['Ubuntu', 'Chrome', '22.0.0'],
    syncFullHistory: false,
    markOnlineOnConnect: config.AUTO_READ_STATUS === 'true',
    generateHighQualityLinkPreview: false,
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.error('[ARCHON] ❌ QR received — session invalid.')
      console.error('         https://bamako-steel-dev.xyz/whatsapp')
      await clearSession()
      sock = null
      setTimeout(() => startConnection(config), 5000)
      return
    }

    if (connection === 'open') {
      retries = 0
      console.log('[ARCHON] ✅ WhatsApp connected!')
      console.log(`[ARCHON] 🤖 ${config.BOT_NAME} is online`)
    }

    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode
      console.log(`[ARCHON] Connection closed. Reason: ${reason}`)

      if (reason === DisconnectReason.loggedOut) {
        console.error('[ARCHON] ❌ Logged out. Generate new session at:')
        console.error('         https://bamako-steel-dev.xyz/whatsapp')
        await clearSession()
        sock = null
        setTimeout(() => startConnection(config), 10000)
        return
      }

      if (retries < MAX_RETRIES) {
        retries++
        const delay = Math.min(1000 * 2 ** retries, 30000)
        console.log(`[ARCHON] Reconnecting in ${delay}ms (${retries}/${MAX_RETRIES})...`)
        setTimeout(() => startConnection(config), delay)
      } else {
        console.error('[ARCHON] Max retries reached. Waiting 60s...')
        retries = 0
        setTimeout(() => startConnection(config), 60000)
      }
    }
  })

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    for (const raw of messages) {
      try {
        const msg = await serialize(sock, raw, config)
        if (!msg || !msg.body) continue
        for (const plugin of plugins) {
          if (plugin.command === msg.command) {
            await plugin.handler(sock, msg, config)
            break
          }
        }
      } catch (err) {
        console.error('[ARCHON] Plugin error:', err.message)
      }
    }
  })

  if (config.REJECT_CALL === 'true') {
    sock.ev.on('call', async (calls) => {
      for (const call of calls) {
        if (call.status === 'offer') await sock.rejectCall(call.id, call.from)
      }
    })
  }

  return sock
}

module.exports = { startConnection }
