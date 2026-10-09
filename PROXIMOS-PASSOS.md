# Próximos passos: copy.

Checklist do que falta para terminar o projeto. Situação em **09/10/2026**.

## Onde está cada coisa

| O quê | Onde |
|---|---|
| Código | https://github.com/eminesf/copydot (branch `main`) |
| Hospedagem | Render, serviço **copydot** (plano Free): https://dashboard.render.com |
| Site no ar | https://copydot.onrender.com |
| Domínio | **copydot.com.br** no Registro.br (expira em 09/10/2027) |
| Monitor que mantém o servidor acordado | UptimeRobot: https://dashboard.uptimerobot.com |
| Perfil do GitHub (README) | https://github.com/eminesf/eminesf |

Todo `git push` na `main` faz deploy automático no Render (~1 min). Se não disparar,
use **Manual Deploy → Deploy latest commit** no painel do serviço.

---

## 1. DNS no Registro.br (prioridade)

Em 09/10 às ~16h45 o domínio estava **"em transição"**: o Registro.br só libera a edição da
zona DNS cerca de 2h depois da compra. Se ainda aparecer "Domínio em transição", espere mais.

1. Acesse https://registro.br, vá em **Painel → copydot.com.br → DNS → Configurar zona DNS**.
2. Crie estas entradas:

   | Tipo | Nome | Dados |
   |---|---|---|
   | **A** | *(deixe em branco)* | `216.24.57.1` |
   | **CNAME** | `www` | `copydot.onrender.com` |

   - O Registro.br **não aceita `@`**: para o domínio principal, deixe o nome vazio.
   - **Não crie registro AAAA** (IPv6). Se existir algum, apague; ele atrapalha a verificação do Render.
3. Salve.

## 2. Verificar o domínio no Render

O Render já está configurado com `copydot.com.br` e `www.copydot.com.br` (o www redireciona
para o principal). Os dois estão em **"Waiting for DNS"**.

1. Painel do Render → **copydot → Settings → Custom Domains**.
2. Clique no ícone 🔄 ao lado de cada domínio para verificar.
3. Se não verificar, espere a propagação (minutos a algumas horas) e tente de novo.
   Para checar a propagação: https://dnschecker.org (procure `copydot.com.br`, tipo A → `216.24.57.1`).
4. O certificado HTTPS é emitido sozinho depois da verificação.
5. Teste: https://copydot.com.br e https://www.copydot.com.br

## 3. Atualizar o UptimeRobot

O monitor acessa o site a cada 5 min para o plano grátis do Render não "dormir"
(ele desliga após 15 min sem acessos e leva ~1 min para acordar).

1. https://dashboard.uptimerobot.com → abra o monitor do copydot → **Edit**.
2. Troque a URL para: `https://copydot.com.br/api/health`
3. Intervalo: **5 minutes**. Salve.

> A URL antiga (`copydot.onrender.com`) continuaria funcionando, mas com o domínio novo
> o monitor também avisa se o DNS quebrar.

## 4. Google Search Console (para aparecer no Google)

1. Acesse https://search.google.com/search-console → **Adicionar propriedade** → **Domínio** → `copydot.com.br`.
2. O Google mostra um registro **TXT** (`google-site-verification=...`).
   No Registro.br, em **Configurar zona DNS**, crie: Tipo **TXT**, Nome *(em branco)*, Dados: o valor que o Google deu.
3. Volte ao Search Console e clique em **Verificar** (pode levar algumas horas).
4. Em **Sitemaps**, envie: `https://copydot.com.br/sitemap.xml`
5. Em **Inspeção de URL**, cole `https://copydot.com.br/` e clique em **Solicitar indexação**.

O que já está pronto no código: título e descrição com palavras-chave, canonical, Open Graph
(`/og.png`), dados estruturados (WebApplication + FAQ), "Como funciona" + FAQ na home,
`robots.txt`, `sitemap.xml` e salas com `noindex`.

## 5. Conferir a prévia do link

Depois que o domínio funcionar, cole `https://copydot.com.br` em:
- https://www.linkedin.com/post-inspector/ (prévia do LinkedIn)
- https://www.opengraph.xyz (prévia geral: WhatsApp, X, etc.)

Deve aparecer a imagem com "copy." e o título.

## 6. Divulgação (links ajudam no Google)

- [ ] Post no LinkedIn mostrando o projeto (com link e um GIF/print)
- [ ] TabNews: https://www.tabnews.com.br
- [ ] Diretórios: Product Hunt, AlternativeTo (como alternativa ao tmps.fyi / Pushbullet)
- [ ] Reddit: r/brdev, r/webdev (mostrando o projeto)
- [ ] Atualizar o link do copy. no README do perfil do GitHub para `https://copydot.com.br`

## 7. GitHub (perfil)

- [ ] **Customize your pins**: copydot, ml-ofertas, zoiudo, pokeprinterbr, hamza-arise
- [ ] Preencher o **About** (descrição) de cada repositório fixado
- [ ] Decidir sobre o `emiliano.dev`: o site no ar só mostra "Emiliano F.". Ou tirar dos destaques,
      ou virar um portfólio de verdade (você já tem o domínio **emiliano.dev.br**)

## 8. Antes de ganhar dinheiro (ver seção "Monetização")

- [ ] Páginas de **Privacidade** e **Termos de uso** (exigidas pelo Google AdSense e pela LGPD)
- [ ] Mais conteúdo para SEO: páginas para buscas específicas, por exemplo
      "copiar texto do iPhone para o Windows", "enviar print do celular para o PC",
      "passar link do celular para o computador"
- [ ] Limite de tentativas de senha por IP (rate limit), antes de divulgar muito

---

## Avisos e coisas para saber

- **Manutenção do Render em 13/10 às 22h (Brasília):** o servidor deve reiniciar. Salas abertas
  mostram "Este espaço expirou" (comportamento esperado).
- **Tudo fica em memória:** reiniciar ou fazer deploy apaga as salas. É por isso que precisa ser
  **1 instância só** (não aumente réplicas).
- **Limites atuais:** 25 MB por arquivo, 100 MB e 100 itens por sala, 100 mil caracteres por texto.
- **750 h grátis por mês** no Render por conta: o copydot precisa ser o **único** serviço grátis
  ligado 24h.
- Na rede do trabalho, o firewall bloqueia testes pelo terminal (`Invoke-WebRequest`, `curl`)
  para sites externos. No navegador funciona normal.

## Monetização (resumo)

Dá para ganhar dinheiro, mas **depende de tráfego** e costuma ser pouco no começo.

1. **Anúncios (AdSense):** só na home e nas páginas de conteúdo, **nunca dentro da sala**.
   Precisa de Privacidade/Termos e de conteúdo; site de uma página só costuma ser recusado.
2. **Plano Pro (depois, se houver uso):** arquivos maiores, salas que duram mais, nome reservado,
   sem anúncios. Exige guardar arquivos fora da memória (ex.: Cloudflare R2), o que tem custo.
3. **Doações (Pix / Buy Me a Coffee):** fácil de colocar, rende pouco.
4. **Valor indireto:** como portfólio e projeto no LinkedIn, ele já vale. Mostra produto completo,
   do design ao deploy.

Ordem sugerida: domínio + Search Console → divulgação → Privacidade/Termos + páginas de SEO →
AdSense quando passar de alguns milhares de visitas por mês → Pro só se houver demanda.
