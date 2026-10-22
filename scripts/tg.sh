#!/usr/bin/env bash
# Send a Telegram message to the owner: scripts/tg.sh "text"
cd "$(dirname "$0")/.."
TOK=$(sed -n 's/^TELEGRAM_BOT_TOKEN=//p' .env); CHAT=$(sed -n 's/^TELEGRAM_CHAT_ID=//p' .env)
curl -s -m 20 -X POST "https://api.telegram.org/bot$TOK/sendMessage" -d chat_id="$CHAT" -d disable_web_page_preview=true --data-urlencode text="$1" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log(j.ok?'sent':'FAILED: '+j.description)})"
