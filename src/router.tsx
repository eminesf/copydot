import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

// O TanStack Start chama getRouter() tanto no servidor (SSR) quanto no navegador.
export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultNotFoundComponent: () => (
      <main className="page center">
        <h1>Página não encontrada</h1>
        <a href="/">Voltar ao início</a>
      </main>
    ),
  })
}
