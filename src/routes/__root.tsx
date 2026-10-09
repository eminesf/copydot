// Rota raiz: o "documento" HTML que envolve todas as páginas.
import type { ReactNode } from 'react'
import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import css from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      // viewport-fit=cover + env(safe-area-inset-*) no CSS = respeita o notch do iPhone
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { title: 'copy — cole aqui, pegue lá' },
      { name: 'description', content: 'Copie texto, imagens e arquivos entre seus dispositivos. Sem conta, sem app.' },
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
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
