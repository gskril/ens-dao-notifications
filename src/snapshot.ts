import { Address, Hex } from 'viem';

export async function getSnapshotProposals() {
  const query = `
    query {
      proposals (
        first: 10,
        skip: 0,
        where: {
          space: "ens.eth",
          state: "active"
        },
        orderBy: "created",
        orderDirection: desc
      ) {
        id
        title
        author
        state
        body
      }
    }
  `;

  const res = await fetch('https://hub.snapshot.org/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  const { data } = (await res.json()) as {
    data: {
      proposals: {
        id: Hex;
        title: string;
        author: Address;
        body: string;
      }[];
    };
  };

  return data.proposals;
}
