import * as React from 'react';
import type { Metadata } from 'next';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from '@/theme';
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';

const SITE_URL = 'https://jaredsburrows.github.io';
const TITLE = "Jared's GitHub Pages";
const DESCRIPTION = "List of all Jared's GitHub Pages.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  keywords: ['jared burrows', 'jared', 'burrows', 'github', 'pages'],
  authors: [{ name: 'Jared Burrows', url: 'https://jaredsburrows.com' }],
  alternates: { canonical: `${SITE_URL}/` },
  icons: { icon: '/favicon.ico' },
  verification: { google: 'wXZjUJohTKlFAoqAe2LvvhcuM1bH49QmsE8kksjrtqE' },
  openGraph: {
    type: 'website',
    title: TITLE,
    description: DESCRIPTION,
    siteName: TITLE,
    url: '/',
    images: ['/favicon.ico'],
  },
  twitter: {
    card: 'summary',
    site: '@jaredsburrows',
    title: TITLE,
    description: DESCRIPTION,
  },
};

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  url: `${SITE_URL}/`,
  name: TITLE,
  description: "Explore Jared Burrows' projects, tutorials, and web apps hosted on GitHub Pages.",
  publisher: {
    '@type': 'Person',
    name: 'Jared Burrows',
    url: 'https://jaredsburrows.com',
    sameAs: [
      'https://www.linkedin.com/in/jaredburrows/',
      'https://github.com/jaredsburrows',
    ],
  },
};

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {/* React 19 hoists resource links to <head>; saves a TLS handshake
            before the first GitHub API call */}
        <link rel="preconnect" href="https://api.github.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
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
