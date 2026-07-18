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

