import { Env } from './worker';

export class Telegram {
  private TOKEN: string;
  private CHANNEL_ID: string;
  private ENDPOINT: string;

  constructor(env: Env) {
    if (!env.TELEGRAM_TOKEN || !env.CHANNEL_ID) {
      throw new Error('Missing Telegram config');
    }

    this.TOKEN = env.TELEGRAM_TOKEN;
    this.CHANNEL_ID = env.CHANNEL_ID;
    this.ENDPOINT = `https://api.telegram.org/bot${this.TOKEN}/sendMessage`;
  }

  async sendMessage(message: string) {
    const res = await fetch(this.ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: '-100' + this.CHANNEL_ID,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) throw new Error('Telegram error');

    const result = await res.json();
    return result;
  }
}
