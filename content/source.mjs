import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { loadEnvFile } from 'node:process';
import { isWithin } from './paths.mjs';

// npm scripts run in the project root. import.meta.url changes during prerender bundling.
export const frameworkRoot = realpathSync(process.cwd());
const envFile = join(frameworkRoot, '.env');
if (existsSync(envFile)) loadEnvFile(envFile);

// Select one bundle; personal content never merges into public examples.
export const contentRoot = realpathSync(
  resolve(frameworkRoot, process.env.SITE_CONTENT_DIR || 'examples/site'),
);
const exampleRoot = realpathSync(join(frameworkRoot, 'examples/site'));
if (contentRoot !== exampleRoot && isWithin(frameworkRoot, contentRoot)) {
  throw new Error('个人内容包必须位于框架仓库之外；仓库内只允许 examples/site。');
}
export const blogDirectory = join(contentRoot, 'blog');
export const publicDirectory = join(contentRoot, 'public');
export const siteOrigin = new URL(process.env.SITE_URL || 'https://example.com').origin;
export const basePath = process.env.BASE_PATH || '/';

/** @param {'site.json' | 'projects.json'} name */
export function readContentJson(name) {
  return JSON.parse(readFileSync(join(contentRoot, name), 'utf8'));
}
