'use strict'
const path = require('path')
const fs = require('fs')

const envPath = path.join(__dirname, 'config.env')
if (fs.existsSync(envPath)) require('dotenv').config({ path: envPath })

const SESSION_ID = (process.env.SESSION_ID || '').trim()

// Validate: must start with archon_ and be at least 15 chars
if (!SESSION_ID || !SESSION_ID.startsWith('archon_') || SESSION_ID.length < 15) {
  console.error('❌ Invalid or missing SESSION_ID.')
  console.error('   Get yours at: https://bamako-steel-dev.xyz/whatsapp')
  console.error('   Format: archon_xxxxxxxxxxxxxxxxxxxx')
  process.exit(1)
}

module.exports = {
  SESSION_ID,
  PREFIX:       (process.env.PREFIX || '.').trim(),
  BOT_NAME:     (process.env.BOT_NAME || 'ARCHON').trim(),
  BOT_LANG:     (process.env.BOT_LANG || 'fr').trim(),
  OWNER_NUMBER: (process.env.OWNER_NUMBER || '').trim(),
  SUDO:         (process.env.SUDO || '').trim(),
  TZ:           process.env.TZ || 'Africa/Bamako',
  AUTO_READ_STATUS: process.env.AUTO_READ_STATUS || 'false',
  REJECT_CALL:  process.env.REJECT_CALL || 'false',
  SESSION_API:  'https://bamako-steel-dev.xyz/api/whatsapp/fetch',
}

