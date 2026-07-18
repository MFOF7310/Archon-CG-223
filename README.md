ARCHON CG-223 · WhatsApp Bot

Feature-rich WhatsApp bot for the ARCHON CG-223 ecosystem.

Get your Session ID

Visit: https://bamako-steel-dev.xyz/whatsapp

Deploy on VPS

```bash
git clone https://github.com/MFOF7310/Archon-CG-223 archon-wa
cd archon-wa
npm install
cp config.env.example config.env
# Edit config.env with your SESSION_ID
pm2 start index.js --name archon-wa
```

Config variables

Variable	Required	Default	Description	
`SESSION_ID`	✅	—	From https://bamako-steel-dev.xyz/whatsapp	
`PREFIX`	❌	`.`	Command prefix	
`BOT_NAME`	❌	`ARCHON`	Bot display name	
`BOT_LANG`	❌	`fr`	`fr` or `en`	
`OWNER_NUMBER`	✅	—	Your number with country code	
`SUDO`	❌	—	Extra admin numbers, comma separated	
`TZ`	❌	`Africa/Bamako`	Timezone	
`AUTO_READ_STATUS`	❌	`false`	Mark online/read status behavior	
`REJECT_CALL`	❌	`false`	Auto-reject calls	

Deploy on Bot-Hosting.net

Upload files, set env vars in the panel, start with:

```bash
node index.js
```