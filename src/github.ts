import { Octokit } from '@octokit/rest';
import prettier from 'prettier';
import mdParser from 'prettier/plugins/markdown';

import { Env } from './worker';

type AddProposalParams = {
  markdown: string;
  proposalId: bigint;
  title: string | null;
};

type CreateFileParams = {
  branch: string;
  ep: number;
  markdown: string;
};

type OpenPullRequestParams = {
  branch: string;
  ep: number;
};

export class GitHub {
  private octokit: Octokit;
  private owner = 'gskril';
  private repo = 'ens-docs';

  constructor(env: Env) {
    if (!env.GITHUB_TOKEN) {
      throw new Error('Missing GitHub token');
    }

    this.octokit = new Octokit({ auth: env.GITHUB_TOKEN });
  }

  async addProposal({ markdown, proposalId, title }: AddProposalParams) {
    const branch = `prop/${proposalId}`;
    // TODO: Assign an EP number based on the current term and the number of proposals in that term
    const ep = 99.9;
    await this.createBranch(branch);
    await this.createFile({ branch, markdown, ep });
    await this.openPullRequest({ branch, ep });
  }

  private async createBranch(branch: string) {
    const mainBranch = await this.octokit.rest.git.getRef({
      owner: this.owner,
      repo: this.repo,
      ref: 'heads/master',
    });

    await this.octokit.rest.git.createRef({
      owner: this.owner,
      repo: this.repo,
      ref: `refs/heads/${branch}`,
      sha: mainBranch.data.object.sha,
    });
  }

  private async createFile({ branch, ep, markdown }: CreateFileParams) {
    return this.octokit.rest.repos.createOrUpdateFileContents({
      owner: this.owner,
      repo: this.repo,
      path: `src/pages/dao/proposals/${ep}.md`,
      message: `Add EP ${ep}`,
      content: await this.formatFile(markdown),
      branch,
    });
  }

  private async openPullRequest({ branch, ep }: OpenPullRequestParams) {
    return this.octokit.rest.pulls.create({
      owner: this.owner,
      repo: this.repo,
      body: 'This is an automated pull request to add a new DAO proposal to the ENS docs.',
      title: `Add EP ${ep}`,
      head: branch,
      base: 'master',
    });
  }

  private async formatFile(markdown: string) {
    // Run prettier on the markdown, matching the ENS docs formatting
    const formatted = await prettier.format(markdown, {
      semi: false,
      tabWidth: 2,
      useTabs: false,
      singleQuote: true,
      trailingComma: 'es5',
      plugins: [mdParser],
      parser: 'markdown',
    });

    // Base64 encode the markdown
    const content = btoa(formatted);

    return content;
  }
}
