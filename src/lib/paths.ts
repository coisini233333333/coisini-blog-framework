/** 让本地 /、GitHub 项目 /blog/ 和自定义域名下的链接使用同一套写法。 */
export function withBase(path = ''): string {
  if (/^(?:https?:\/\/|mailto:|tel:|#)/i.test(path)) return path;
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/${path.replace(/^\/+/, '')}`;
}
