// Download/visualização de um arquivo da sala.
import { createFileRoute } from '@tanstack/react-router'
import { RoomError, getFile } from '../../../../server/rooms'

export const Route = createFileRoute('/api/rooms/$slug/files/$id')({
  server: {
    handlers: {
      GET: ({ request, params }) => {
        const url = new URL(request.url)
        try {
          const { item, data } = getFile(params.slug, url.searchParams.get('t') ?? '', params.id)
          const disposition = url.searchParams.has('download') ? 'attachment' : 'inline'
          return new Response(new Uint8Array(data), {
            headers: {
              'Content-Type': item.mime,
              'Content-Length': String(data.length),
              'Content-Disposition': `${disposition}; filename*=UTF-8''${encodeURIComponent(item.name)}`,
              'Cache-Control': 'private, max-age=600',
              // Impede que um HTML enviado seja executado como página do site.
              'Content-Security-Policy': "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'",
              'X-Content-Type-Options': 'nosniff',
            },
          })
        } catch (err) {
          if (err instanceof RoomError) return new Response(err.code, { status: err.status })
          throw err
        }
      },
    },
  },
})
