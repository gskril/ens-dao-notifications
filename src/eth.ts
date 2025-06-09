import { Address, PublicClient, createPublicClient, http } from 'viem';
import { decodeEventLog } from 'viem';
import { mainnet } from 'viem/chains';

import { abi, address } from './governor';
import { Env } from './worker';

export function createViemClient(env: Env) {
  if (!env.ETH_RPC) {
    throw new Error('ETH_RPC is not set');
  }

  return createPublicClient({
    chain: mainnet,
    transport: http(env.ETH_RPC),
    // Viem is super strict with types, so we need to cast to PublicClient to make it easy to pass as a prop to other functions
  }) as unknown as PublicClient;
}

export async function getRecentLogs(client: PublicClient) {
  // Get the latest block number
  const blockNumber = await client.getBlockNumber();

  // Get the logs for the last 50 blocks
  const logs = await client.getLogs({
    address,
    fromBlock: blockNumber - 50n,
    toBlock: blockNumber,
  });

  // Decode the logs
  const decodedLogs = logs.map((log) => decodeEventLog({ abi, data: log.data, topics: log.topics }));

  // Filter to relevant events (ProposalCreated)
  const filteredLogs = decodedLogs.filter((log) => log.eventName === 'ProposalCreated');

  // We only care about the args
  return filteredLogs.map((log) => log.args);
}

export function truncateAddress(address: Address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
