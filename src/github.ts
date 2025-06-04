import { RequestError } from '@octokit/request-error';
import { Octokit } from '@octokit/rest';
import prettier from 'prettier';
import mdParser from 'prettier/plugins/markdown';

import { Env } from './worker';

type AddProposalParams = {
  author: string;
  id: bigint | string;
  markdown: string;
  title: string | null;
};

type CreateFileParams = {
  author: string;
  branch: string;
  ep: string;
  markdown: string;
  title: string | null;
};

type OpenPullRequestParams = {
  branch: string;
  ep: string;
};

type FormatFileParams = {
  author: string;
  markdown: string;
  title: string | null;
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

  async addProposal({ author, id, markdown, title }: AddProposalParams) {
    const branch = `prop/${id}`;
    const ep = await this.assignNumber();
    const createdBranch = await this.createBranch(branch);

    if (createdBranch) {
      await this.createFile({ author, branch, markdown, ep, title });
      const pr = await this.openPullRequest({ branch, ep });
      console.log(`Created PR ${pr.data.html_url}`);
    }
  }

  private async createBranch(branch: string) {
    const mainBranch = await this.octokit.rest.git.getRef({
      owner: this.owner,
      repo: this.repo,
      ref: 'heads/master',
    });

    try {
      return await this.octokit.rest.git.createRef({
        owner: this.owner,
        repo: this.repo,
        ref: `refs/heads/${branch}`,
        sha: mainBranch.data.object.sha,
      });
    } catch (error) {
      if (error instanceof RequestError) {
        console.log(`Branch already exists`);
        return null;
      } else {
        throw error;
      }
    }
  }

  private async createFile({ author, branch, ep, markdown, title }: CreateFileParams) {
    return this.octokit.rest.repos.createOrUpdateFileContents({
      owner: this.owner,
      repo: this.repo,
      path: `src/pages/dao/proposals/${ep}.mdx`,
      message: `Add EP ${ep}`,
      content: await this.formatFile({ author, markdown, title }),
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
      maintainer_can_modify: true,
    });
  }

  private async assignNumber() {
    // Get the current term
    const [startingYear, startingTerm] = [2025, 6];

    // Each term is 1 year long, starting on the first of the year
    const currentYear = new Date().getFullYear();
    const currentTerm = Math.floor((currentYear - startingYear) / 1) + startingTerm;

    // Get the number of proposals in the current term
    // filenames in the `src/pages/dao/proposals` directory are of the form `{ep}.mdx`
    const proposals = await this.octokit.rest.repos.getContent({
      owner: this.owner,
      repo: this.repo,
      path: 'src/pages/dao/proposals',
    });

    // Enforce that proposals.data is an array (which is always the case, since the path above is a directory)
    // This is just a formality to make TypeScript happy
    if (!Array.isArray(proposals.data)) {
      throw new Error('Proposals directory not found');
    }

    const currentTermProposals = proposals.data.filter((file) => file.name.startsWith(`${currentTerm}.`));
    const currentTermProposalCount = currentTermProposals.length;
    const nextProposalNumber = currentTermProposalCount + 1;
    return `${currentTerm}.${nextProposalNumber}`;
  }

  private async formatFile({ author, markdown, title }: FormatFileParams) {
    if (title) {
      // Under the first title, add `::authors`
      markdown = markdown.replace(title, `${title}\n\n::authors\n`);
    }

    // Add frontmatter
    markdown = `---
authors:
  - ${author}
proposal:
  type: 'executable'
---

${markdown}`;

    // Run prettier on the markdown, matching the ENS docs formatting
    const formatted = await prettier.format(markdown, {
      semi: false,
      tabWidth: 2,
      useTabs: false,
      singleQuote: true,
      trailingComma: 'es5',
      plugins: [mdParser],
      parser: 'mdx',
    });

    // Base64 encode the markdown
    const content = btoa(formatted);

    return content;
  }
}
