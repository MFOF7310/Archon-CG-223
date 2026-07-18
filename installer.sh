#!/usr/bin/env bash
set -euo pipefail
# ARCHON CG-223 - regenerate all project files
# Usage: bash ARCHON_CG_223_installer.sh.txt [target_dir]
TARGET="${1:-./Archon-CG-223}"
mkdir -p "$TARGET"
cat > "$TARGET/.gitignore" <<'EOF_ARCHON_0'
node_modules/
session/
config.env
*.db
.env
EOF_ARCHON_0

cat > "$TARGET/DEPLOYMENT_NOTES.md" <<'EOF_ARCHON_1'
# ARCHON CG-223 — notes de déploiement

## 1) Endpoint dashboard à ajouter

Fichier cible: `/opt/dashboard/api/boot.ts`

Ajouter cette route avant le catch-all `app.all("/api/*")`:

```ts
// ── WA session fetch (used by archon-wa bot on startup) ──
app.get("/api/whatsapp/fetch/:sessionId", async (c) => {
  try {
    const sid = c.req.param("sessionId");
    const res = await fetch(
      "http://127.0.0.1:5002/api/whatsapp/fetch/" + encodeURIComponent(sid)
    );
    if (!res.ok) return c.json({ error: "Session not found" }, 404);
    return c.json(await res.json());
  } catch {
    return c.json({ error: "Bot API unavailable" }, 503);
  }
});
```

Puis rebuild/restart:

```bash
cd /opt/dashboard && npm run build && python3 -c "with open('dist/boot.js','r') as f: c=f.read(); c=c.replace(\"\\'module\\'\",'\'module\''); open('dist/boot.js','w').write(c)" && pm2 restart architect-dashboard --update-env
```

## 2) Déploiement bot

Ne pas toucher à `/root/levanter/`.

```bash
cd /root
git clone https://github.com/MFOF7310/Archon-CG-223 archon-wa
cd archon-wa
npm install

cat > config.env << 'EOF'
SESSION_ID=archon_YOURIDSHERE
PREFIX=.
BOT_NAME=ARCHON
BOT_LANG=fr
OWNER_NUMBER=22300000000
TZ=Africa/Bamako
REJECT_CALL=false
EOF

node --check index.js
node --check lib/connection.js
node --check lib/session.js

pm2 start index.js --name archon-wa
pm2 save
pm2 logs archon-wa
```

## 3) Push manuel si besoin

```bash
cd /mnt/agents/work/Archon-CG-223
git remote add origin https://github.com/MFOF7310/Archon-CG-223.git 2>/dev/null || true
git push -u origin main
```
EOF_ARCHON_1

cat > "$TARGET/Dockerfile" <<'EOF_ARCHON_2'
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
CMD ["node", "index.js"]
EOF_ARCHON_2

cat > "$TARGET/LICENSE" <<'EOF_ARCHON_3'
MIT License

Copyright (c) 2026 MFOFANA

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF_ARCHON_3

cat > "$TARGET/README.md" <<'EOF_ARCHON_4'
# ARCHON CG-223 · WhatsApp Bot

Feature-rich WhatsApp bot for the ARCHON CG-223 ecosystem.

## Get your Session ID

Visit: https://bamako-steel-dev.xyz/whatsapp

## Deploy on VPS

```bash
git clone https://github.com/MFOF7310/Archon-CG-223 archon-wa
cd archon-wa
npm install
cp config.env.example config.env
# Edit config.env with your SESSION_ID
pm2 start index.js --name archon-wa
```

## Config variables

| Variable | Required | Default | Description |
|---|---:|---|---|
| `SESSION_ID` | ✅ | — | From https://bamako-steel-dev.xyz/whatsapp |
| `PREFIX` | ❌ | `.` | Command prefix |
| `BOT_NAME` | ❌ | `ARCHON` | Bot display name |
| `BOT_LANG` | ❌ | `fr` | `fr` or `en` |
| `OWNER_NUMBER` | ✅ | — | Your number with country code |
| `SUDO` | ❌ | — | Extra admin numbers, comma separated |
| `TZ` | ❌ | `Africa/Bamako` | Timezone |
| `AUTO_READ_STATUS` | ❌ | `false` | Mark online/read status behavior |
| `REJECT_CALL` | ❌ | `false` | Auto-reject calls |

## Deploy on Bot-Hosting.net

Upload files, set env vars in the panel, start with:

```bash
node index.js
```
EOF_ARCHON_4

cat > "$TARGET/config.env.example" <<'EOF_ARCHON_5'
SESSION_ID=archon_xxxxxxxxxxxxxxxxxxxx
PREFIX=.
BOT_NAME=ARCHON
BOT_LANG=fr
OWNER_NUMBER=22300000000
SUDO=22300000001
TZ=Africa/Bamako
AUTO_READ_STATUS=false
REJECT_CALL=false
EOF_ARCHON_5

cat > "$TARGET/config.js" <<'EOF_ARCHON_6'
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
EOF_ARCHON_6

cat > "$TARGET/index.js" <<'EOF_ARCHON_7'
'use strict'

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
EOF_ARCHON_7

mkdir -p "$TARGET/lang"
cat > "$TARGET/lang/en.json" <<'EOF_ARCHON_8'
{
  "connected": "✅ ARCHON connected",
  "disconnected": "❌ ARCHON disconnected",
  "session_not_found": "Session not found. Generate one at bamako-steel-dev.xyz/whatsapp",
  "session_error": "Session error. Please try again.",
  "owner_only": "❌ Owner only command.",
  "pong": "🟢 Online"
}
EOF_ARCHON_8

mkdir -p "$TARGET/lang"
cat > "$TARGET/lang/fr.json" <<'EOF_ARCHON_9'
{
  "connected": "✅ ARCHON connecté",
  "disconnected": "❌ ARCHON déconnecté",
  "session_not_found": "Session introuvable. Générez-en une sur bamako-steel-dev.xyz/whatsapp",
  "session_error": "Erreur de session. Réessayez.",
  "owner_only": "❌ Commande réservée au propriétaire.",
  "pong": "🟢 En ligne"
}
EOF_ARCHON_9

mkdir -p "$TARGET/lib"
cat > "$TARGET/lib/connection.js" <<'EOF_ARCHON_10'
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
  // 1. Fetch session from dashboard
  await fetchSession(config.SESSION_ID, config.SESSION_API)

  // 2. Load auth state
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR)
  const { version } = await fetchLatestBaileysVersion()

  // 3. Load plugins
  const plugins = await loadPlugins()

  // 4. Create socket — NO QR, EVER
  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    browser: ['ARCHON CG-223', 'Chrome', '120.0.0'],
    syncFullHistory: false,
    markOnlineOnConnect: config.AUTO_READ_STATUS === 'true',
    generateHighQualityLinkPreview: false,
  })

  // 5. Handle creds update
  sock.ev.on('creds.update', saveCreds)

  // 6. Handle connection state
  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    // Hard block on QR — should never happen but just in case
    if (qr) {
      console.error('[ARCHON] ❌ QR received — session invalid. Get a new one at:')
      console.error('         https://bamako-steel-dev.xyz/whatsapp')
      await clearSession()
      process.exit(1)
    }

    if (connection === 'open') {
      retries = 0
      console.log('[ARCHON] ✅ WhatsApp connected successfully')
      console.log(`[ARCHON] 🤖 ${config.BOT_NAME} is online`)
    }

    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode
      const shouldReconnect = reason !== DisconnectReason.loggedOut

      console.log(`[ARCHON] Connection closed. Reason: ${reason}`)

      if (reason === DisconnectReason.loggedOut) {
        console.error('[ARCHON] ❌ Logged out. Generate a new session at:')
        console.error('         https://bamako-steel-dev.xyz/whatsapp')
        await clearSession()
        process.exit(1)
      }

      if (shouldReconnect && retries < MAX_RETRIES) {
        retries++
        const delay = Math.min(1000 * 2 ** retries, 30000)
        console.log(`[ARCHON] Reconnecting in ${delay}ms (attempt ${retries}/${MAX_RETRIES})...`)
        setTimeout(() => startConnection(config), delay)
      } else if (retries >= MAX_RETRIES) {
        console.error('[ARCHON] ❌ Max reconnect attempts reached. Exiting.')
        process.exit(1)
      }
    }
  })

  // 7. Handle messages
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

  // 8. Call rejection
  if (config.REJECT_CALL === 'true') {
    sock.ev.on('call', async (calls) => {
      for (const call of calls) {
        if (call.status === 'offer') {
          await sock.rejectCall(call.id, call.from)
        }
      }
    })
  }

  return sock
}

module.exports = { startConnection }
EOF_ARCHON_10

mkdir -p "$TARGET/lib"
cat > "$TARGET/lib/serialize.js" <<'EOF_ARCHON_11'
'use strict'

async function serialize(sock, msg, config) {
  if (!msg.message) return null

  const type = Object.keys(msg.message)[0]
  const body =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    ''

  const from = msg.key.remoteJid
  const isGroup = from?.endsWith('@g.us')
  const sender = isGroup
    ? msg.key.participant || msg.pushName
    : msg.key.remoteJid
  const senderNumber = sender?.replace(/[^0-9]/g, '')

  const ownerNumbers = [
    config.OWNER_NUMBER,
    ...(config.SUDO ? config.SUDO.split(',') : [])
  ].map(n => n.replace(/[^0-9]/g, '')).filter(Boolean)

  const isOwner = ownerNumbers.includes(senderNumber)
  const prefix = config.PREFIX
  const command = body.startsWith(prefix)
    ? body.slice(prefix.length).trim().split(' ')[0].toLowerCase()
    : null
  const args = body.split(' ').slice(1)

  const reply = async (text) => {
    await sock.sendMessage(from, { text }, { quoted: msg })
  }

  const react = async (emoji) => {
    await sock.sendMessage(from, {
      react: { text: emoji, key: msg.key }
    })
  }

  return {
    msg, from, type, body, sender, senderNumber,
    isGroup, isOwner, command, args,
    reply, react,
    quoted: msg.message?.extendedTextMessage?.contextInfo?.quotedMessage || null,
  }
}

module.exports = { serialize }
EOF_ARCHON_11

mkdir -p "$TARGET/lib"
cat > "$TARGET/lib/session.js" <<'EOF_ARCHON_12'
'use strict'
const fs = require('fs-extra')
const path = require('path')
const axios = require('axios')

const SESSION_DIR = path.join(__dirname, '..', 'session')

async function fetchSession(sessionId, apiBase) {
  console.log(`[ARCHON] Fetching session: ${sessionId}`)
  
  let data
  try {
    const res = await axios.get(`${apiBase}/${encodeURIComponent(sessionId)}`, {
      timeout: 15000
    })
    data = res.data
  } catch (err) {
    if (err.response?.status === 404) {
      throw new Error(
        `Session not found: "${sessionId}"\n` +
        `Generate one at: https://bamako-steel-dev.xyz/whatsapp`
      )
    }
    throw new Error(`Failed to reach session API: ${err.message}`)
  }

  // API returns { success: true, data: { creds: {...}, keys: {...} } }
  // OR { fullSession: "base64string" } — handle both
  if (!data || data.error) {
    throw new Error(data?.error || 'Session API returned empty response')
  }

  await fs.ensureDir(SESSION_DIR)

  if (data.data?.creds) {
    // Structured format: write creds.json and keys
    await fs.writeJson(
      path.join(SESSION_DIR, 'creds.json'),
      data.data.creds,
      { spaces: 2 }
    )
    if (data.data.keys) {
      for (const [key, value] of Object.entries(data.data.keys)) {
        await fs.writeJson(
          path.join(SESSION_DIR, `${key}.json`),
          value,
          { spaces: 2 }
        )
      }
    }
  } else if (data.fullSession) {
    // Levanter-style: base64 encoded full session string
    // Format: "archon_XXXX;base64data" or just base64
    const raw = data.fullSession.includes(';')
      ? data.fullSession.split(';')[1]
      : data.fullSession
    const decoded = Buffer.from(raw, 'base64').toString('utf8')
    const parsed = JSON.parse(decoded)
    if (parsed.creds) {
      await fs.writeJson(path.join(SESSION_DIR, 'creds.json'), parsed.creds, { spaces: 2 })
    }
    if (parsed.keys) {
      for (const [key, value] of Object.entries(parsed.keys)) {
        await fs.writeJson(path.join(SESSION_DIR, `${key}.json`), value, { spaces: 2 })
      }
    }
  } else {
    throw new Error('Unrecognized session format from API')
  }

  console.log(`[ARCHON] Session written to ./session/`)
  return SESSION_DIR
}

async function clearSession() {
  await fs.emptyDir(SESSION_DIR)
  console.log('[ARCHON] Session cleared.')
}

module.exports = { fetchSession, clearSession, SESSION_DIR }
EOF_ARCHON_12

mkdir -p "$TARGET/lib"
cat > "$TARGET/lib/utils.js" <<'EOF_ARCHON_13'
'use strict'
const fs = require('fs')
const path = require('path')

const PLUGINS_DIR = path.join(__dirname, '..', 'plugins')

async function loadPlugins() {
  const files = fs.readdirSync(PLUGINS_DIR).filter(f => f.endsWith('.js'))
  const plugins = []
  for (const file of files) {
    try {
      const p = require(path.join(PLUGINS_DIR, file))
      if (p.command && p.handler) plugins.push(p)
    } catch (err) {
      console.error(`[ARCHON] Failed to load plugin ${file}:`, err.message)
    }
  }
  console.log(`[ARCHON] Loaded ${plugins.length} plugin(s)`)
  return plugins
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

const formatBytes = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}

const getLang = (key, lang = 'fr') => {
  try {
    const file = path.join(__dirname, '..', 'lang', `${lang}.json`)
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))
    return data[key] || key
  } catch { return key }
}

module.exports = { loadPlugins, sleep, formatBytes, getLang }
EOF_ARCHON_13

cat > "$TARGET/package.json" <<'EOF_ARCHON_14'
{
  "name": "archon-cg-223",
  "version": "1.0.0",
  "description": "ARCHON CG-223 WhatsApp Bot",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "@whiskeysockets/baileys": "^6.7.18",
    "axios": "^1.7.2",
    "dotenv": "^16.4.5",
    "pino": "^9.3.2",
    "pino-pretty": "^11.0.0",
    "fs-extra": "^11.2.0",
    "qrcode": "^1.5.3"
  }
}
EOF_ARCHON_14

mkdir -p "$TARGET/plugins"
cat > "$TARGET/plugins/ping.js" <<'EOF_ARCHON_15'
'use strict'
const { getLang } = require('../lib/utils')

module.exports = {
  command: 'ping',
  handler: async (sock, msg, config) => {
    const uptime = process.uptime()
    const h = Math.floor(uptime / 3600)
    const m = Math.floor((uptime % 3600) / 60)
    const s = Math.floor(uptime % 60)
    await msg.react('🟢')
    await msg.reply(
      `🟢 *${config.BOT_NAME}* en ligne\n` +
      `⏱️ Uptime: ${h}h ${m}m ${s}s\n` +
      `📡 bamako-steel-dev.xyz`
    )
  }
}
EOF_ARCHON_15

echo "ARCHON CG-223 files written to $TARGET"

