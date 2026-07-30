import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  output: 'static',
  site: 'https://aiempoweredgroup.com',
  integrations: [
    sitemap({
      filter: (page) =>
        !/\/(portal|admin|login|success|payment-cancelled)\/?$/.test(page),
    }),
  ],
});
