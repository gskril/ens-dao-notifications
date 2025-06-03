# ENS DAO Notifications

Cloudflare Worker that runs as a cron job to check for new ENS DAO proposals.

- If a new proposal is found, a message is sent to [this Telegram channel](https://t.me/ensdao_notifications).
- Processed transactions are stored in Workers KV to avoid duplicate notifications.

To set this up, you'll need a Telegram API token and a Telegram channel where your bot has permission to post messages.

- Create a new bot and get an API token by messaging [BotFather](https://t.me/botfather).
- Find the ID of your Telegram channel on [web.telegram.org](https://web.telegram.org/). Use the value after "-100" in the URL. For example, the [ENS DAO Notifications](https://t.me/ensdao_notifications) channel has the URL `https://web.telegram.org/a/#-1001934911549`, so the ID is `1934911549`.

Learn how to set the environment variables in [`wrangler.toml`](wrangler.toml).

## Development

To simulate cron triggers locally, run the following command:

```bash
curl "http://localhost:8787/cdn-cgi/handler/scheduled?cron=*+*+*+*+*"
```
