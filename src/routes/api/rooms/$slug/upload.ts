// Upload de arquivo/imagem: o corpo da requisição é o próprio arquivo.
import { createFileRoute } from '@tanstack/react-router'
import { MAX_FILE, RoomError, addFile } from '../../../../server/rooms'

export const Route = createFileRoute('/api/rooms/$slug/upload')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const declared = Number(request.headers.get('content-length') ?? 0)
        if (declared > MAX_FILE) return new Response('TOO_LARGE', { status: 413 })

        try {
          const data = Buffer.from(await request.arrayBuffer())
          addFile(
            params.slug,
            request.headers.get('x-token') ?? '',
            request.headers.get('x-device') ?? '',
            decodeURIComponent(request.headers.get('x-filename') ?? ''),
            request.headers.get('content-type') ?? '',
            data,
          )
          return new Response(null, { status: 204 })
        } catch (err) {
          if (err instanceof RoomError) return new Response(err.code, { status: err.status })
          throw err
        }
      },
    },
  },
})
