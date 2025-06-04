import { createViemClient, getRecentLogs, truncateAddress } from './eth';
import { GitHub } from './github';
import { extractTitle } from './markdown';
import { Telegram } from './telegram';

export interface Env {
  // KV to store already processed transactions
  TRANSACTIONS: KVNamespace;

  // Telegram bot config
  TELEGRAM_TOKEN?: string;
  CHANNEL_ID?: string;

  // Ethereum RPC
  ETH_RPC?: string;

  // Github token
  GITHUB_TOKEN?: string;
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const github = new GitHub(env);
    const telegram = new Telegram(env);
    const client = createViemClient(env);
    const logs = await getRecentLogs(client);

    if (!logs) return;

    for (const log of logs) {
      const { description: markdown, proposer, proposalId: id } = log;
      const key = id.toString();

      // Check if the transaction has already been processed
      const existing = await env.TRANSACTIONS.get(key);
      if (existing) continue;

      const title = extractTitle(markdown);
      const ensName = await client.getEnsName({ address: proposer });
      const author = ensName || truncateAddress(proposer);

      const messageParts = [
        `Proposer: ${author}`,
        `Vote on [Tally](https://www.tally.xyz/gov/ens/proposal/${id}) or [Agora](https://agora.ensdao.org/proposals/${id})`,
      ];

      if (title) {
        // Push the title to the beginning of the message with an extra line break
        messageParts.unshift('');
        messageParts.unshift(`*New Executable Proposal*: ${title}`);
      } else {
        messageParts.unshift(`*New Executable Proposal*`);
      }

      const message = messageParts.join('\n');
      await telegram.sendMessage(message);
      await github.addProposal({ author, id, markdown, title });
      console.log(`Processed proposal ${id}`);

      // Save transaction to KV
      await env.TRANSACTIONS.put(key, '1');
    }
  },
};
