import { abi, address } from './governor';
import { publicClient } from './client';
import { decodeEventLog } from 'viem';
import { Telegram } from './telegram';

interface Env {
  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  // MY_KV_NAMESPACE: KVNamespace;

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

    for (const log of decodedLogs) {
      if (log.eventName === 'ProposalCreated') {
        const { proposer, proposalId } = log.args;
        const ensName = await publicClient.getEnsName({ address: proposer });

        const message = `*New ENS DAO Proposal* \nPosted by ${
          ensName || proposer
        } \n[View on Tally](https://www.tally.xyz/gov/ens/proposal/${proposalId})`;

        const result = await telegram.sendMessage(message);
        console.log(result);
      }
    }
  },
};
