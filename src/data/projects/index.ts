import { z } from 'astro/zod';
import { readContentJson } from '../../../content/source.mjs';
const projectSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z.string().min(1),
    subtitle: z.string(),
    description: z.string(),
    tags: z.array(z.string()),
    status: z.string(),
    overview: z.string(),
    focus: z.array(z.string()),
    noteSlug: z.string().optional(),
    references: z.array(
      z.object({
        label: z.string(),
        url: z.url({ protocol: /^https?$/ }),
      }),
    ),
  })
  .strict();
export type Project = z.infer<typeof projectSchema>;
export const projects = z.array(projectSchema).parse(readContentJson('projects.json'));
if (new Set(projects.map(({ slug }) => slug)).size !== projects.length) {
  throw new Error('projects.json 中的 slug 不得重复');
}
