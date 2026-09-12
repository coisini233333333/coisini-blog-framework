import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { publicDirectory, siteOrigin, basePath } from './content/source.mjs';

// Content and deploy addresses are supplied at build time; no browser credentials.
export default defineConfig({
  site: siteOrigin,
  base: basePath,
  publicDir: publicDirectory,
  output: 'static',
  trailingSlash: 'always',
  integrations: [sitemap()],
  markdown: {
    shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' } },
  },
  devToolbar: { enabled: false },
});
