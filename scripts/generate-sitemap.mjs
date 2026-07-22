// Writes out/sitemap.xml after `next build`. The site is a single page, so a
// static sitemap beats crawling the previously-deployed site like the old CI did.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SITE_URL = 'https://jaredsburrows.github.io';
const lastmod = new Date().toISOString().slice(0, 10);

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;

const outPath = join(process.cwd(), 'out', 'sitemap.xml');
writeFileSync(outPath, sitemap);
console.log(`Wrote ${outPath}`);
