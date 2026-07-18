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

ARCHON CG-223 — notes de déploiement

1) Endpoint dashboard à ajouter

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

2) Déploiement bot

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

3) Push manuel si besoin

```bash
cd /mnt/agents/work/Archon-CG-223
git remote add origin https://github.com/MFOF7310/Archon-CG-223.git 2>/dev/null || true
git push -u origin main
```