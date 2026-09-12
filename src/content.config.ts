import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { pathToFileURL } from 'node:url';
import { blogDirectory } from '../content/source.mjs';

const blog = defineCollection({
  loader: glob({
    base: pathToFileURL(`${blogDirectory}/`),
    pattern: '**/*.md',
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()),
    category: z.enum(['essay', 'technical']).default('technical'),
    draft: z.boolean().default(false),
    sample: z.boolean().default(false),
    cover: z.string().optional(),
    coverAlt: z.string().default(''),
    art: z.enum(['landscape', 'particles', 'interface']).default('landscape'),
  }),
});

export const collections = { blog };
