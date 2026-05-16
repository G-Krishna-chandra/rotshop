import Anthropic from '@anthropic-ai/sdk';
import { simpleGit } from 'simple-git';
import { mkdir, readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { CATEGORIES, COMPLEXITY_LEVELS, PRICING_MODELS } from '@rotshop/shared';
import type { Category, Complexity, PricingModel } from '@rotshop/shared';
import { config } from '../config.js';

export interface RepoAnalysis {
  name: string;
  description: string;
  category: Category;
  techStack: string[];
  inputContract: string;
  outputContract: string;
  complexity: Complexity;
  suggestedPrice: number;
  pricingModel: PricingModel;
}

const README_NAMES = ['README.md', 'README.MD', 'Readme.md', 'readme.md', 'README'];
const MANIFEST_NAMES = ['package.json', 'requirements.txt', 'pyproject.toml', 'go.mod', 'Cargo.toml', 'Gemfile'];
const SKIP_DIRS = new Set(['node_modules', '__pycache__', '.git', 'dist', 'build', '.next', 'target', 'venv', '.venv']);

export async function cloneRepo(githubUrl: string, targetPath: string): Promise<void> {
  await mkdir(targetPath, { recursive: true });
  const git = simpleGit();
  // Shallow, single-branch clone for speed
  await git.clone(githubUrl, targetPath, ['--depth', '1', '--single-branch']);
}

async function readFirstExisting(dir: string, names: string[]): Promise<{ name: string; content: string } | null> {
  for (const name of names) {
    const p = join(dir, name);
    if (!existsSync(p)) continue;
    try {
      const content = await readFile(p, 'utf-8');
      return { name, content };
    } catch {
      // unreadable, skip
    }
  }
  return null;
}

async function buildFileTree(dir: string, maxDepth = 2, depth = 0): Promise<string[]> {
  if (depth > maxDepth) return [];
  const lines: string[] = [];
  let items;
  try {
    items = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  for (const item of items) {
    if (item.name.startsWith('.') || SKIP_DIRS.has(item.name)) continue;
    const indent = '  '.repeat(depth);
    if (item.isDirectory()) {
      lines.push(`${indent}${item.name}/`);
      const child = await buildFileTree(join(dir, item.name), maxDepth, depth + 1);
      lines.push(...child);
    } else {
      lines.push(`${indent}${item.name}`);
    }
  }
  return lines;
}

const SYSTEM_PROMPT = `You analyze GitHub repositories and produce metadata for Rotshop, a marketplace where repos become callable APIs.

Return ONLY a single valid JSON object with this exact shape (no markdown, no commentary):
{
  "name": "string — short product name, 2-5 words",
  "description": "string — one sentence: what it does + who it's for",
  "category": "string — exactly one of: Auth, Payments, Notifications, Analytics, AI/ML, DevOps, UI Components, Data Pipelines",
  "techStack": ["array of short strings — primary tech, e.g. Node.js, FastAPI, Python, TypeScript, React"],
  "inputContract": "string — concise description of the request body shape clients should send",
  "outputContract": "string — concise description of the response body shape clients receive",
  "complexity": "string — exactly one of: Easy, Medium, Advanced",
  "suggestedPrice": "number — price in USD cents, typically 500-50000",
  "pricingModel": "string — exactly one of: buy (one-time purchase, e.g. components/libs), royalty (usage-based, e.g. APIs/infra)"
}

Use 'AI/ML' if any LLM, embedding, or inference is involved. Use 'DevOps' for tooling/CI/CD. Default category 'AI/ML' if genuinely unclear.
Be honest — minimal repos get complexity Easy and a low price.`;

export async function analyzeRepo(repoPath: string, githubUrl: string): Promise<RepoAnalysis> {
  const readme = await readFirstExisting(repoPath, README_NAMES);
  const manifest = await readFirstExisting(repoPath, MANIFEST_NAMES);
  const tree = await buildFileTree(repoPath, 2);

  if (!config.anthropicApiKey) {
    return heuristicAnalysis(githubUrl, readme?.content, manifest);
  }

  const userPrompt = [
    `Repo URL: ${githubUrl}`,
    '',
    `--- README (${readme?.name ?? 'none'}) ---`,
    readme ? readme.content.slice(0, 8000) : '(no README found)',
    '',
    `--- Manifest (${manifest?.name ?? 'none'}) ---`,
    manifest ? manifest.content.slice(0, 4000) : '(no manifest found)',
    '',
    `--- File tree (top 2 levels, first 150 entries) ---`,
    tree.slice(0, 150).join('\n'),
  ].join('\n');

  try {
    const client = new Anthropic({ apiKey: config.anthropicApiKey });
    const msg = await client.messages.create({
      model: config.claudeModel,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n');
    return parseAndValidate(text, githubUrl, readme?.content, manifest);
  } catch (err) {
    console.warn('[repo-analyzer] Claude call failed, using heuristic fallback:', (err as Error).message);
    return heuristicAnalysis(githubUrl, readme?.content, manifest);
  }
}

function parseAndValidate(
  text: string,
  githubUrl: string,
  readme: string | undefined,
  manifest: { name: string; content: string } | null,
): RepoAnalysis {
  const fallback = heuristicAnalysis(githubUrl, readme, manifest);
  const stripped = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');

  let parsed: any;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    const match = stripped.match(/\{[\s\S]*\}/);
    if (!match) return fallback;
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return fallback;
    }
  }

  const category = (CATEGORIES as readonly string[]).includes(parsed.category) ? parsed.category : fallback.category;
  const complexity = (COMPLEXITY_LEVELS as readonly string[]).includes(parsed.complexity) ? parsed.complexity : fallback.complexity;
  const pricingModel = (PRICING_MODELS as readonly string[]).includes(parsed.pricingModel) ? parsed.pricingModel : fallback.pricingModel;

  return {
    name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim().slice(0, 80) : fallback.name,
    description: typeof parsed.description === 'string' ? parsed.description.slice(0, 500) : fallback.description,
    category: category as Category,
    techStack: Array.isArray(parsed.techStack) ? parsed.techStack.slice(0, 10).map(String) : fallback.techStack,
    inputContract: typeof parsed.inputContract === 'string' ? parsed.inputContract.slice(0, 800) : fallback.inputContract,
    outputContract: typeof parsed.outputContract === 'string' ? parsed.outputContract.slice(0, 800) : fallback.outputContract,
    complexity: complexity as Complexity,
    suggestedPrice: typeof parsed.suggestedPrice === 'number' && parsed.suggestedPrice >= 0
      ? Math.round(parsed.suggestedPrice)
      : fallback.suggestedPrice,
    pricingModel: pricingModel as PricingModel,
  };
}

function heuristicAnalysis(
  githubUrl: string,
  readme: string | undefined,
  manifest: { name: string; content: string } | null,
): RepoAnalysis {
  const repoName = basename(githubUrl.replace(/\.git$/, '').replace(/\/$/, ''));
  const firstHeader = readme?.split('\n').find((l) => l.trim().length > 0)?.replace(/^#+\s*/, '').trim();

  const techStack: string[] = [];
  if (manifest?.name === 'package.json') techStack.push('Node.js', 'JavaScript');
  if (manifest?.name === 'requirements.txt' || manifest?.name === 'pyproject.toml') techStack.push('Python');
  if (manifest?.name === 'go.mod') techStack.push('Go');
  if (manifest?.name === 'Cargo.toml') techStack.push('Rust');
  if (manifest?.name === 'Gemfile') techStack.push('Ruby');
  if (manifest?.content?.includes('typescript') || manifest?.content?.includes('@types/')) techStack.push('TypeScript');
  if (manifest?.content?.includes('fastapi')) techStack.push('FastAPI');
  if (manifest?.content?.includes('"react"') || manifest?.content?.includes('@vitejs/plugin-react')) techStack.push('React');

  return {
    name: firstHeader?.slice(0, 80) || repoName,
    description: readme
      ? readme.split('\n').filter((l) => l.trim() && !l.startsWith('#')).slice(0, 1).join(' ').slice(0, 200) || `Imported from ${githubUrl}.`
      : `Imported from ${githubUrl}.`,
    category: 'AI/ML',
    techStack,
    inputContract: 'JSON object — schema to be defined by submitter.',
    outputContract: 'JSON object — schema to be defined by submitter.',
    complexity: 'Medium',
    suggestedPrice: 1000,
    pricingModel: 'buy',
  };
}
