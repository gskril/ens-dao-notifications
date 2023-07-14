export class Telegram {
  private TOKEN: string;
  private CHANNEL_ID: string;
  private ENDPOINT: string;

  constructor(TELEGRAM_TOKEN: string, TELEGRAM_CHANNEL_ID: string) {
    this.TOKEN = TELEGRAM_TOKEN;
    this.CHANNEL_ID = TELEGRAM_CHANNEL_ID;
    this.ENDPOINT = `https://api.telegram.org/bot${this.TOKEN}/sendMessage`;
  }

  async sendMessage(message: string) {
    const res = await fetch(this.ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: -100 + this.CHANNEL_ID,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    if (!res.ok) throw new Error('Telegram error');

    const result = await res.json();
    return result;
  }
}
