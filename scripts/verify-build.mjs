import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { existsSync } from 'node:fs';
import { blogDirectory, siteOrigin, basePath } from '../content/source.mjs';

const output = resolve('dist');
const origin = siteOrigin;
const base = `/${basePath.replace(/^\/+|\/+$/g, '')}`.replace(/\/$/, '');
const files = await readdir(output, { recursive: true });
const pages = files.filter((file) => file.endsWith('.html'));
assert(pages.length > 0, '先运行 npm run build，再检查构建产物。');

// 从源文件读取草稿标记，覆盖示例文章和今后新增的草稿。
const contentDirectory = blogDirectory;
const contentFiles = (await readdir(contentDirectory, { recursive: true })).filter((file) =>
  file.endsWith('.md'),
);
const draftSlugs = [];
for (const file of contentFiles) {
  const markdown = await readFile(join(contentDirectory, file), 'utf8');
  const frontmatter = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] || '';
  if (/^draft:\s*true\s*$/m.test(frontmatter)) {
    draftSlugs.push(file.replaceAll('\\', '/').replace(/\.md$/, ''));
  }
}

function assertNoDraftLinks(text, label) {
  for (const slug of draftSlugs)
    assert(!text.includes(`/posts/${slug}/`), `${label}: 草稿 ${slug} 出现在公开链接中`);
}

async function fileFor(pathname) {
  assert(pathname === base || pathname.startsWith(`${base}/`), `缺少部署前缀 ${base}: ${pathname}`);
  const relative = decodeURIComponent(pathname.slice(base.length)).replace(/^\/+/, '');
  const file = resolve(output, relative || 'index.html');
  assert(file.startsWith(`${output}\\`) || file.startsWith(`${output}/`), `路径越界: ${pathname}`);
  const details = await stat(file).catch(() => null);
  assert(details, `站内链接或资源不存在: ${pathname}`);
  return details.isDirectory() ? join(file, 'index.html') : file;
}

let references = 0;
for (const page of pages) {
  const html = await readFile(join(output, page), 'utf8');
  const relative = page.replaceAll('\\', '/').replace(/index\.html$/, '');
  const pageUrl = new URL(`${base}/${relative}`, origin);
  assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1, `${page}: 应有一个主标题`);
  assert(html.includes('lang="zh-CN"'), `${page}: 缺少页面语言`);
  assertNoDraftLinks(html, page);
  const canonical = html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/);
  if (page !== '404.html') {
    assert(canonical, `${page}: 缺少 canonical`);
    assert.equal(canonical[1], pageUrl.href, `${page}: canonical 与部署路径不符`);
  } else {
    assert(html.includes('name="robots" content="noindex"'), '404 页面应禁止索引');
  }
  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const url = new URL(match[1].replaceAll('&amp;', '&'), pageUrl);
    if (url.origin !== origin) continue;
    const target = await fileFor(url.pathname);
    await stat(target);
    if (url.hash && target.endsWith('.html')) {
      const targetHtml = await readFile(target, 'utf8');
      assert(
        targetHtml.includes(`id="${decodeURIComponent(url.hash.slice(1))}"`),
        `${page}: 锚点不存在 ${url.href}`,
      );
    }
    references++;
  }
}
for (const slug of draftSlugs)
  assert(!existsSync(join(output, 'posts', slug, 'index.html')), `草稿 ${slug} 不能生成公开文件`);
const feed = await readFile(join(output, 'rss.xml'), 'utf8');
assertNoDraftLinks(feed, 'RSS');
assert.equal(
  feed.match(/<link>([^<]+)<\/link>/)?.[1],
  `${origin}${base}/`,
  'RSS 频道首页缺少部署前缀',
);
for (const match of feed.matchAll(/<link>([^<]+)<\/link>/g)) {
  const url = new URL(match[1]);
  assert.equal(url.origin, origin, 'RSS 站点地址错误');
  if (url.pathname.includes('/posts/')) await fileFor(url.pathname);
}
const robots = await readFile(join(output, 'robots.txt'), 'utf8');
assert(
  robots.includes(`Sitemap: ${origin}${base}/sitemap-index.xml`),
  'robots 中的 sitemap 地址错误',
);
const sitemap = await readFile(join(output, 'sitemap-0.xml'), 'utf8');
assertNoDraftLinks(sitemap, 'sitemap');
for (const match of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
  const url = new URL(match[1]);
  assert.equal(url.origin, origin, 'sitemap 站点地址错误');
  await fileFor(url.pathname);
}
console.log(
  `通过：${pages.length} 个 HTML 页面，${references} 个站内链接/资源；草稿、RSS、sitemap、canonical 均正确。部署地址：${origin}${base}/`,
);
