import { z } from 'astro/zod';
import { readContentJson } from '../../content/source.mjs';

const webUrl = z.url({ protocol: /^https?$/ });
const assetPath = z
  .string()
  .refine((value) => value === '' || /^\/(?!\/)/.test(value), '使用站内 /images/... 路径');
export const siteSchema = z
  .object({
    title: z.string().min(1),
    author: z.string().min(1),
    description: z.string(),
    subtitle: z.string(),
    heroTitle: z.tuple([z.string(), z.string()]),
    github: webUrl,
    heroImage: assetPath,
    heroImageAlt: z.string(),
    avatarImage: assetPath.default(''),
    about: z.string(),
    projectsDescription: z.string(),
  })
  .strict();
export const siteConfig = siteSchema.parse(readContentJson('site.json'));
