import { cpSync, existsSync, realpathSync } from 'node:fs';
import { resolve, dirname, basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isWithin } from '../content/paths.mjs';

const root = realpathSync(fileURLToPath(new URL('../', import.meta.url)));
const argument = process.argv[2];
if (!argument) throw new Error('用法：npm run content:init -- ../my-private-content');
const destination = resolve(root, argument);
if (!existsSync(dirname(destination))) throw new Error('请先创建目标的父目录。');
const canonicalDestination = join(realpathSync(dirname(destination)), basename(destination));
if (isWithin(root, canonicalDestination)) {
  throw new Error('请把个人内容包创建在框架仓库之外。');
}
if (existsSync(destination)) throw new Error('目标已存在；为保护现有文章，初始化不会覆盖目录。');
cpSync(resolve(root, 'examples/site'), destination, {
  recursive: true,
  errorOnExist: true,
  force: false,
});
console.log('内容包已创建。把其路径写入本地 .env 的 SITE_CONTENT_DIR；内容包请单独私有备份。');
