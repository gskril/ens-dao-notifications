import { Tokens, marked } from 'marked';

export function extractTitle(markdown: string) {
  const tokens = marked.lexer(markdown);
  const headings = tokens.filter((token) => token.type === 'heading' && token.depth === 1) as Tokens.Heading[];
  return headings[0]?.text || null;
}
