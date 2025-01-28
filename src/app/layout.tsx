import * as React from 'react';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from '@/theme';
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';

export const metadata = {
  title: "Jared's GitHub Pages",
  description: "List of all Jared's GitHub Pages.",
  keywords: "jared burrows, jared, burrows, github, pages",
};

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Jared&#39;s GitHub Pages</title>

        {/* Canonical URL */}
        <link rel="canonical" href="https://jaredsburrows.github.io/" />

        {/* Favicon */}
        <link rel="icon" href="/favicon.ico?" type="image/x-icon" />

        {/* SEO Meta Tags */}
        <meta name="description" content="List of all Jared's GitHub Pages." />
        <meta name="keywords" content="jared burrows, jared, burrows, github, pages" />
        <meta name="author" content="Jared Burrows" />

        {/* Google Verification */}
        <meta name="google-site-verification" content="wXZjUJohTKlFAoqAe2LvvhcuM1bH49QmsE8kksjrtqE" />

        {/* OpenGraph Meta - https://ogp.me/ */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Jared's GitHub Pages" />
        <meta property="og:description" content="List of all Jared's GitHub Pages." />
        <meta property="og:site_name" content="Jared's GitHub Pages" />
        <meta property="og:url" content="https://jaredsburrows.github.io/" />
        <meta property="og:image" content="/favicon.ico" />
        <meta property="og:logo" content="/favicon.ico" />

        {/* Twitter Meta - https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/markup */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:site" content="@jaredsburrows" />
        <meta name="twitter:domain" content="jaredsburrows.github.io" />
        <meta name="twitter:title" content="Jared's GitHub Pages" />
        <meta name="twitter:description" content="List of all Jared's GitHub Pages." />
        <meta name="twitter:url" content="https://jaredsburrows.github.io/" />

        {/* OpenGraph - https://schema.org */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "url": "https://jaredsburrows.github.io/",
            "name": "Jared's GitHub Pages",
            "description": "Explore Jared Burrows' projects, tutorials, and web apps hosted on GitHub Pages.",
            "publisher": {
              "@type": "Person",
              "name": "Jared Burrows",
              "url": "https://jaredsburrows.com",
              "sameAs": [
                "https://www.linkedin.com/in/jaredburrows/",
                "https://github.com/jaredsburrows"
              ]
            },
            "potentialAction": {
              "@type": "SearchAction",
              "target": "https://jaredsburrows.github.io/?q={search_term_string}",
              "query-input": "required name=search_term_string"
            }
          }),
        }} />
      </head>
      <body>
        <InitColorSchemeScript attribute="class" />
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <ThemeProvider theme={theme}>
            {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
            <CssBaseline />
            {props.children}
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
