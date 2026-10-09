// Tempo real com Server-Sent Events: o navegador abre um EventSource e o
// servidor vai empurrando eventos por essa conexão. Funciona em qualquer
// navegador e não precisa de servidor WebSocket separado.
import { createFileRoute } from '@tanstack/react-router'
import { RoomError, subscribe } from '../../../../server/rooms'
import type { RoomEvent } from '../../../../lib/types'

export const Route = createFileRoute('/api/rooms/$slug/events')({
  server: {
    handlers: {
      GET: ({ request, params }) => {
        const token = new URL(request.url).searchParams.get('t') ?? ''
        const encoder = new TextEncoder()
        let cleanup = () => {}

        let stream: ReadableStream
        try {
          stream = new ReadableStream({
            start(controller) {
              const write = (chunk: string) => {
                try {
                  controller.enqueue(encoder.encode(chunk))
                } catch {
                  cleanup()
                }
              }
              const send = (event: RoomEvent) => write(`data: ${JSON.stringify(event)}\n\n`)
              const unsubscribe = subscribe(params.slug, token, send)
              // Comentário a cada 20s mantém a conexão viva em proxies e no celular.
              const ping = setInterval(() => write(': ping\n\n'), 20_000)
              cleanup = () => {
                clearInterval(ping)
                unsubscribe()
                cleanup = () => {}
              }
              request.signal.addEventListener('abort', () => cleanup())
            },
            cancel() {
              cleanup()
            },
          })
        } catch (err) {
          if (err instanceof RoomError) return new Response(err.code, { status: err.status })
          throw err
        }

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
          },
        })
      },
    },
  },
})
