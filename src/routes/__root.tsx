// Rota raiz: o "documento" HTML que envolve todas as páginas.
import type { ReactNode } from 'react'
import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import css from '../styles.css?url'
import { SEO_DESCRIPTION, SEO_TITLE, SITE_URL } from '../lib/seo'
import { THEME_SCRIPT } from '../components/ui'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      // viewport-fit=cover + env(safe-area-inset-*) no CSS = respeita o notch do iPhone
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      // Padrões; cada rota pode sobrescrever (a última definição vence).
      { title: 'copy.' },
      { name: 'description', content: SEO_DESCRIPTION },
      // Prévia ao compartilhar o link (WhatsApp, LinkedIn, X...).
      { property: 'og:site_name', content: 'copy.' },
      { property: 'og:type', content: 'website' },
      { property: 'og:locale', content: 'pt_BR' },
      { property: 'og:title', content: SEO_TITLE },
      { property: 'og:description', content: SEO_DESCRIPTION },
      { property: 'og:image', content: `${SITE_URL}/og.png` },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'theme-color', content: '#f8fafc', media: '(prefers-color-scheme: light)' },
      { name: 'theme-color', content: '#0b1120', media: '(prefers-color-scheme: dark)' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
    ],
    links: [
      { rel: 'stylesheet', href: css },
      { rel: 'icon', href: '/icon.svg', type: 'image/svg+xml' },
      { rel: 'apple-touch-icon', href: '/icon.svg' },
      { rel: 'manifest', href: '/manifest.webmanifest' },
    ],
  }),
  component: () => (
    <RootDocument>
      <Outlet />
    </RootDocument>
  ),
})

function RootDocument({ children }: { children: ReactNode }) {
  return (
    // suppressHydrationWarning: o THEME_SCRIPT mexe no data-theme antes do React hidratar.
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
