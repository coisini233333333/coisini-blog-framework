import { execFileSync, spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
  readFileSync,
} from 'node:fs';
import { join, resolve, relative, isAbsolute } from 'node:path';
import { frameworkRoot, siteOrigin, basePath, publicDirectory } from '../content/source.mjs';

process.chdir(frameworkRoot);
function run(command, args, cwd = frameworkRoot, capture = false) {
  return execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    windowsHide: true,
  });
}
const repository = process.env.PAGES_REPOSITORY;
if (!repository || !/^[A-Za-z0-9-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
  throw new Error('在本地 .env 设置 PAGES_REPOSITORY=OWNER/REPO。');
}
if (!process.env.SITE_URL || !process.env.BASE_PATH || siteOrigin === 'https://example.com') {
  throw new Error('请先设置真实 SITE_URL 和 BASE_PATH，避免发布错误的链接。');
}
const [owner, repositoryName] = repository.toLowerCase().split('/');
const hostname = new URL(siteOrigin).hostname;
const normalizedBase = '/' + basePath.replace(/^\/+|\/+$/g, '');
if (hostname.endsWith('.github.io')) {
  const expectedBase = repositoryName === owner + '.github.io' ? '/' : '/' + repositoryName;
  if (hostname !== owner + '.github.io' || normalizedBase.toLowerCase() !== expectedBase) {
    throw new Error('SITE_URL / BASE_PATH 与目标 GitHub Pages 仓库不匹配。');
  }
} else if (
  normalizedBase !== '/' ||
  readFileSync(join(publicDirectory, 'CNAME'), 'utf8').trim() !== hostname
) {
  throw new Error('自定义域名要求 BASE_PATH=/，且 public/CNAME 必须与 SITE_URL 域名一致。');
}
run('gh', ['auth', 'status']);
const metadata = JSON.parse(
  run('gh', ['api', 'repos/' + repository, '--jq', '{private,permissions}'], frameworkRoot, true),
);
if (metadata.private || !metadata.permissions?.push) {
  throw new Error('发布目标必须是你有写入权限的公开框架仓库；脚本不会修改仓库可见性。');
}
// Rebuild from the selected bundle every time; never deploy stale dist.
run(process.execPath, ['node_modules/astro/bin/astro.mjs', 'check']);
run(process.execPath, ['node_modules/astro/bin/astro.mjs', 'build']);
run(process.execPath, ['scripts/verify-build.mjs']);
run(process.execPath, ['scripts/verify-privacy.mjs']);

const stagingRoot = resolve(frameworkRoot, '.publish');
mkdirSync(stagingRoot, { recursive: true });
const staging = mkdtempSync(join(stagingRoot, 'pages-'));
const remote = 'https://github.com/' + repository + '.git';
run('git', ['init', '--initial-branch=gh-pages', staging]);
run('git', ['remote', 'add', 'origin', remote], staging);
const refs = run('git', ['ls-remote', '--heads', 'origin', 'gh-pages'], staging, true).trim();
if (refs) {
  run('git', ['fetch', '--depth=1', 'origin', 'gh-pages'], staging);
  run('git', ['checkout', '-B', 'gh-pages', 'FETCH_HEAD'], staging);
  // This disposable, freshly created checkout contains only the previous deployment.
  for (const entry of readdirSync(staging)) {
    if (entry === '.git') continue;
    const target = resolve(staging, entry);
    const within = relative(staging, target);
    if (!within || within.startsWith('..') || isAbsolute(within))
      throw new Error('发布暂存路径越界');
    rmSync(target, { recursive: true, force: true });
  }
}
cpSync(join(frameworkRoot, 'dist'), staging, { recursive: true });
writeFileSync(join(staging, '.nojekyll'), '');
const email = run('git', ['config', 'user.email'], frameworkRoot, true).trim();
const name = run('git', ['config', 'user.name'], frameworkRoot, true).trim();
run('git', ['config', 'user.email', email], staging);
run('git', ['config', 'user.name', name], staging);
run('git', ['add', '--all'], staging);
const difference = spawnSync('git', ['diff', '--cached', '--quiet'], {
  cwd: staging,
  windowsHide: true,
});
if (difference.status !== 0 && difference.status !== 1) throw new Error('无法检查发布差异');
if (difference.status === 1) {
  run('git', ['commit', '-m', 'deploy: publish static website'], staging);
  run('git', ['push', 'origin', 'gh-pages:gh-pages'], staging);
}
console.log('静态产物已同步。Pages 发布源应为 gh-pages /（root）。网站：' + siteOrigin + basePath);
console.log('请等待 GitHub Pages 构建成功；这里只确认推送，没有声称网站已生效。');
