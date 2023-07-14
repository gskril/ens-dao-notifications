import { decodeEventLog } from 'viem';

import { abi, address } from './governor';
import { publicClient } from './client';
import { Telegram } from './telegram';
import { truncateAddress } from './utils';

interface Env {
  // KV to store already processed transactions
  DAO_NOTIFICATIONS: KVNamespace;

  // Telegram bot config
  TELEGRAM_TOKEN?: string;
  CHANNEL_ID?: string;
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    if (!env.TELEGRAM_TOKEN || !env.CHANNEL_ID) {
      throw new Error('Missing Telegram config');
    }

    // Get the latest block number
    const blockNumber = await publicClient.getBlockNumber();

    // Get the logs for the last 10 blocks
    const logs = await publicClient.getLogs({
      address,
      fromBlock: blockNumber - 10n,
      toBlock: blockNumber,
    });

    // Decode the logs
    const decodedLogs = logs.map((log) => decodeEventLog({ abi, data: log.data, topics: log.topics }));

    if (!decodedLogs) return;
    const telegram = new Telegram(env.TELEGRAM_TOKEN, env.CHANNEL_ID);

    for (let i = 0; i < decodedLogs.length; i++) {
      const { args, eventName } = decodedLogs[i];
      const { transactionHash } = logs[i];

      // Ignore pending transactions
      if (!transactionHash) return;

      // Ignore irrelevant events
      if (eventName !== 'ProposalCreated') return;

      // Check if the transaction has already been processed
      const existing = await env.DAO_NOTIFICATIONS.get(transactionHash);
      if (existing) return;

      const { proposer, proposalId } = args;
      const ensName = await publicClient.getEnsName({ address: proposer });

      const messageParts = [
        `*New Executable Proposal*`,
        `Proposer: ${ensName || truncateAddress(proposer)}`,
        `[View on Tally](https://www.tally.xyz/gov/ens/proposal/${proposalId})`,
      ];

      const message = messageParts.join('\n');
      const result = await telegram.sendMessage(message);
      console.log(result);

      // Save transaction to KV
      await env.DAO_NOTIFICATIONS.put(transactionHash, '1');
    }
  },
};
