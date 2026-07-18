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
