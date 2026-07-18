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

