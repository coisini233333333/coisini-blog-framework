import assert from 'node:assert/strict';
import { readdir, readFile, lstat } from 'node:fs/promises';
import { resolve, join, extname } from 'node:path';
import { blogDirectory, publicDirectory } from '../content/source.mjs';

const output = resolve('dist');
const allowed = new Set([
  '.html',
  '.css',
  '.js',
  '.xml',
  '.txt',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.avif',
  '.ico',
  '.gif',
  '.woff',
  '.woff2',
  '.ttf',
  '.pdf',
  '.mp4',
  '.webm',
  '.mp3',
  '.ogg',
]);
const textExtensions = new Set(['.html', '.css', '.js', '.xml', '.txt', '.svg']);
const secretPattern =
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bgh[pousr]_[A-Za-z0-9]{30,}|\bgithub_pat_[A-Za-z0-9_]{40,}|\bAKIA[0-9A-Z]{16}|\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}/;
const draftFiles = [];
const canaries = [];
for (const file of await readdir(blogDirectory, { recursive: true })) {
  if (!file.endsWith('.md')) continue;
  const source = await readFile(join(blogDirectory, file), 'utf8');
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] || '';
  if (/^draft:\s*true\s*(?:#.*)?$/m.test(frontmatter)) {
    const slug =
      frontmatter.match(/^slug:\s*['"]?([^'"\r\n]+?)['"]?\s*$/m)?.[1] ||
      file.replaceAll('\\', '/').replace(/\.md$/, '');
    draftFiles.push(slug);
    canaries.push(...(source.match(/DRAFT_PRIVACY_CANARY_[A-Z0-9_]+/g) || []));
  }
}
let assets = 0;
for (const directory of [publicDirectory, output]) {
  assert(!(await lstat(directory)).isSymbolicLink(), '发布资源根目录禁止符号链接');
  for (const file of await readdir(directory, { recursive: true })) {
    const fullPath = join(directory, file);
    const details = await lstat(fullPath);
    assert(!details.isSymbolicLink(), '发布资源中禁止符号链接');
    if (details.isDirectory()) continue;
    assert(!file.split(/[\\/]/).some((part) => part.startsWith('.')), '发布资源中禁止隐藏文件');
    assert(
      file === 'CNAME' || allowed.has(extname(file).toLowerCase()),
      '发布资源包含不允许的文件类型（源码、配置或 source map 等）',
    );
    if (file === 'CNAME') {
      assert(
        /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}\s*$/i.test(
          await readFile(fullPath, 'utf8'),
        ),
        'CNAME 必须只包含一个域名',
      );
    }
    if (directory === output) assets++;
    if (textExtensions.has(extname(file).toLowerCase())) {
      const text = await readFile(fullPath, 'utf8');
      assert(!secretPattern.test(text), '发现疑似密钥，已停止发布；检查本地资源');
      for (const marker of canaries) assert(!text.includes(marker), '草稿测试标记进入公开产物');
      for (const slug of draftFiles) {
        assert(!text.includes('/posts/' + slug + '/'), '草稿链接进入公开资源');
      }
    }
  }
}
for (const slug of draftFiles) {
  assert(
    !(await lstat(join(output, 'posts', slug, 'index.html')).catch(() => null)),
    '草稿生成了公开文件',
  );
}
console.log(
  '隐私检查通过：' +
    assets +
    ' 个发布文件；禁止源码、隐藏配置、source map、符号链接和草稿测试标记。',
);
