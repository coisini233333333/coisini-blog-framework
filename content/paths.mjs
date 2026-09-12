import { relative, isAbsolute, sep } from 'node:path';

/** @param {string} root @param {string} candidate */
export function isWithin(root, candidate) {
  const path = relative(root, candidate);
  return path === '' || (path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path));
}
