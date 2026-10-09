// Endpoint leve para "manter acordado": a sala aberta chama a cada poucos minutos
// e um monitor externo (UptimeRobot/cron-job.org) também, para o servidor não dormir.
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: () => new Response('ok', { headers: { 'Cache-Control': 'no-store' } }),
      HEAD: () => new Response(null, { headers: { 'Cache-Control': 'no-store' } }),
    },
  },
})
