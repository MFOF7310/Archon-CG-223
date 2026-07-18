'use strict'
const fs = require('fs-extra')
const path = require('path')

const SESSION_DIR = path.join(__dirname, '..', 'session')

async function fetchSession(sessionId, apiBase) {
  const credsPath = path.join(SESSION_DIR, 'creds.json')

  if (fs.existsSync(credsPath)) {
    console.log('[ARCHON] Session found locally ✓')
    return SESSION_DIR
  }

  // No session yet — log and return null (don't crash)
  console.log('[ARCHON] No session yet. Connect at: https://bamako-steel-dev.xyz/whatsapp')
  return null
}

async function clearSession() {
  await fs.emptyDir(SESSION_DIR)
  console.log('[ARCHON] Session cleared.')
}

module.exports = { fetchSession, clearSession, SESSION_DIR }
