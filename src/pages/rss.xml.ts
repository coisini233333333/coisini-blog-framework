import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';

import { siteConfig } from '../config/site';
import { withBase } from '../lib/paths';
import { getPosts } from '../lib/posts';

export const GET: APIRoute = async (context) => {
  const posts = await getPosts();

  return rss({
    title: siteConfig.title,
    description: siteConfig.description,
    site: new URL(withBase('/'), context.site ?? context.url),
    customData: '<language>zh-CN</language>',
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: new URL(withBase(`/posts/${post.id}/`), context.site ?? context.url).href,
    })),
  });
};
