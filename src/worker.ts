import { createPublicClient, decodeEventLog, http } from 'viem';
import { mainnet } from 'viem/chains';

import { abi, address } from './governor';
import { Telegram } from './telegram';
import { truncateAddress } from './utils';

interface Env {
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
    if (!env.TELEGRAM_TOKEN || !env.CHANNEL_ID) {
      throw new Error('Missing Telegram config');
    }

    const publicClient = createPublicClient({
      chain: mainnet,
      transport: http(env.ETH_RPC),
    });

    // Get the latest block number
    const blockNumber = await publicClient.getBlockNumber();

    // Get the logs for the last 50 blocks
    const logs = await publicClient.getLogs({
      address,
      fromBlock: blockNumber - 50n,
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
      const existing = await env.TRANSACTIONS.get(transactionHash);
      if (existing) return;

      const { proposer, proposalId } = args;
      const ensName = await publicClient.getEnsName({ address: proposer });

      const messageParts = [
        `*New Executable Proposal*`,
        `Proposer: ${ensName || truncateAddress(proposer)}`,
        `View on [Tally](https://www.tally.xyz/gov/ens/proposal/${proposalId}) or [Agora](https://agora.ensdao.org/proposals/${proposalId})`,
      ];

      const message = messageParts.join('\n');
      const result = await telegram.sendMessage(message);
      console.log(result);

      // Save transaction to KV
      await env.TRANSACTIONS.put(transactionHash, '1');
    }
  },
};
