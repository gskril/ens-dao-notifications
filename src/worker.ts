import { createViemClient, getRecentLogs } from './eth';
import { Telegram } from './telegram';
import { truncateAddress } from './utils';

export interface Env {
  // KV to store already processed transactions
  TRANSACTIONS: KVNamespace;

  // Telegram bot config
  TELEGRAM_TOKEN?: string;
  CHANNEL_ID?: string;

  // Ethereum RPC
  ETH_RPC?: string;
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const telegram = new Telegram(env);
    const client = createViemClient(env);
    const logs = await getRecentLogs(client);

    if (!logs) return;

    for (const log of logs) {
      const { proposer, proposalId } = log;
      const key = proposalId.toString();

      // Check if the transaction has already been processed
      const existing = await env.TRANSACTIONS.get(key);
      if (existing) continue;

      const ensName = await client.getEnsName({ address: proposer });

      const messageParts = [
        `*New Executable Proposal*`,
        `Proposer: ${ensName || truncateAddress(proposer)}`,
        `View on [Tally](https://www.tally.xyz/gov/ens/proposal/${proposalId}) or [Agora](https://agora.ensdao.org/proposals/${proposalId})`,
      ];

      const message = messageParts.join('\n');
      const result = await telegram.sendMessage(message);
      console.log(result);

      // Save transaction to KV
      await env.TRANSACTIONS.put(key, '1');
    }
  },
};
