# copy

Área de transferência online entre dispositivos: cole aqui, pegue no outro aparelho.
Inspirado no tmps.fyi, com uma interface mais direta.

```bash
npm install
npm run dev      # http://localhost:3000 (ou a próxima porta livre)
npm run build    # gera .output/
npm start        # roda a versão de produção (PORT=3000 por padrão)
```

**No celular:** com o PC e o celular no mesmo Wi-Fi, abra o endereço "Network" que o
`npm run dev` mostra (ex: `http://192.168.5.12:3000`) ou leia o QR code dentro da sala.

## Deploy

O app guarda as salas em memória, então precisa de **um servidor Node com uma única instância**
(Render, Railway, Fly.io). Serverless, como na Vercel, não funciona sem adaptar o código.

### Render (grátis)

1. No Render: **New → Blueprint** → escolha este repositório. O `render.yaml` já configura
   tudo (plano free, build, start, `/api/health`).
2. O plano grátis **desliga o servidor após 15 min sem requisições** e leva cerca de 1 min para
   religar. Para ele nunca dormir, crie um monitor grátis no [UptimeRobot](https://uptimerobot.com)
   (ou cron-job.org):
   - Tipo **HTTP(s)**, URL `https://SEU-APP.onrender.com/api/health`, intervalo **5 minutos**.
3. Com a sala aberta, o app também faz um ping a cada 4 min, então ele não dorme durante o uso
   mesmo sem o monitor.
4. São 750 h grátis por mês por conta. Um serviço ligado 24h usa ~730 h, então ele precisa ser
   o **único** serviço grátis da conta.

### Railway

1. No Railway: **New Project → Deploy from GitHub repo** → escolha este repositório.
2. O Railway detecta o Node e roda `npm run build` e depois `npm start`. A porta vem da variável `PORT`,
   que o próprio Railway define.
3. Em **Settings → Networking → Generate Domain** você ganha uma URL `https://...up.railway.app`.
   Com HTTPS, copiar e compartilhar funcionam nativamente no celular.
4. Mantenha **1 réplica**: com mais de uma, cada uma teria salas diferentes.

## Como o TanStack Start funciona (usando este projeto como exemplo)

O TanStack Start é um framework full-stack em React. Ele junta o **TanStack Router** (as rotas)
com o **Vite** (build e servidor de dev) e o **Nitro** (servidor de produção). O mesmo projeto
tem frontend e backend.

### 1. Rotas por arquivo: `src/routes/`

Cada arquivo em `src/routes/` vira uma URL. O plugin gera `src/routeTree.gen.ts` sozinho
(não edite esse arquivo).

| Arquivo | URL | O que é |
|---|---|---|
| `__root.tsx` | todas | O documento HTML (`<html>`, `<head>`, CSS) que envolve as páginas |
| `index.tsx` | `/` | A página inicial |
| `$slug.tsx` | `/qualquer-coisa` | A sala. `$slug` é um parâmetro: `Route.useParams().slug` |
| `api/rooms/$slug/events.ts` | `/api/rooms/x/events` | Endpoint HTTP (sem página) |

Uma rota de página exporta `createFileRoute('/caminho')({ component })`.
A página é renderizada no servidor (SSR) e depois "hidratada" no navegador.

### 2. Server functions: `src/lib/api.ts`

```ts
export const sendText = createServerFn({ method: 'POST' })
  .validator((d: { slug: string; token: string; text: string }) => d)
  .handler(({ data }) => rooms.addText(data.slug, data.token, data.text))
```

No componente você chama `await sendText({ data: {...} })` como uma função normal.
No build, o TanStack Start troca isso no navegador por uma chamada HTTP; o `handler`
só existe no servidor. Use `validator` para checar o que vem do cliente, porque ele é
a fronteira de confiança. Erros lançados no handler chegam ao cliente como `Error`.

### 3. Server routes: `src/routes/api/...`

Quando você precisa de controle total da `Request`/`Response` (streaming, upload binário,
download com headers), use `server.handlers` numa rota:

```ts
export const Route = createFileRoute('/api/rooms/$slug/upload')({
  server: { handlers: { POST: async ({ request, params }) => new Response(null, { status: 204 }) } },
})
```

Aqui usamos isso para:
- `events.ts`: **Server-Sent Events**. Uma resposta que nunca termina e por onde o servidor
  empurra eventos. É o "tempo real" do app; o navegador usa `new EventSource(url)`.
- `upload.ts`: recebe o arquivo cru no corpo da requisição.
- `files.$id.ts`: devolve o arquivo (`?download` força baixar).

### 4. Código só de servidor: `src/server/rooms.ts`

Contém o estado das salas em memória, o hash de senha (scrypt) e a expiração. Só é importado
por server functions e server routes, então não vai para o bundle do navegador.

## Fluxo do app

1. Na home, `enterRoom` cria a sala (ou entra nela) e devolve um **token**, que fica no
   `sessionStorage`.
2. A sala abre `EventSource('/api/rooms/:slug/events?t=token')` e recebe `init`
   (itens + quantos estão online), depois `item`, `delete` e `online`.
3. Para enviar texto, usa `sendText`. Para arquivo, é um POST em `/upload`. O servidor avisa
   todo mundo pelo SSE.
4. Quando o último aparelho fecha a página, a sala é apagada depois de 10 minutos.

## Limites e cuidados

- Tudo fica **em memória** num único processo: reiniciar apaga tudo, e não escala para
  vários servidores sem um Redis/pub-sub.
- 25 MB por arquivo, 100 MB e 100 itens por sala, 100 mil caracteres por texto.
- Sem rate limit ainda. Antes de publicar, limite tentativas de senha por IP.
- Em `http://IP-da-rede`, o navegador bloqueia `navigator.clipboard` e `navigator.share`
  (só funcionam em HTTPS). O app cai num método alternativo de copiar. Em produção, use HTTPS.
