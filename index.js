'use strict'

const { startServer } = require('./lib/server')

// Start API server FIRST — before any validation
// So dashboard can always reach port 5002
startServer(5002)

const config = require('./config')
const { startConnection } = require('./lib/connection')

const BANNER = `
╔═══════════════════════════════════╗
║   ARCHON CG-223 · WhatsApp Bot   ║
║   bamako-steel-dev.xyz  🇲🇱        ║
╚═══════════════════════════════════╝
`

console.log(BANNER)
console.log(`[ARCHON] Session: ${config.SESSION_ID}`)
console.log(`[ARCHON] Prefix:  ${config.PREFIX}`)
console.log(`[ARCHON] Lang:    ${config.BOT_LANG}`)
console.log(`[ARCHON] Starting...`)

startConnection(config).catch(err => {
  console.error('[ARCHON] Fatal error:', err.message)
  process.exit(1)
})
