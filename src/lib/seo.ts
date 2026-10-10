// Textos e dados de SEO num lugar só.

/** Endereço oficial (canonical). O Google trata outros endereços (ex: .onrender.com) como cópia. */
export const SITE_URL = 'https://copydot.com.br'

export const SEO_TITLE = 'copy.'
export const SEO_DESCRIPTION =
  'Copie e cole texto, imagens, prints e arquivos entre celular e computador em tempo real. Grátis, sem cadastro e sem instalar app. Funciona no iPhone, Android, Windows e Mac.'

export const FAQ: { q: string; a: string }[] = [
  {
    q: 'O copy. é grátis?',
    a: 'Sim. É grátis e não precisa de cadastro: escolha um nome de espaço e comece a usar.',
  },
  {
    q: 'Como passo um texto do celular para o computador?',
    a: 'Abra copydot.com.br no computador e entre num espaço. No celular, leia o QR code ou digite o mesmo nome. O que você colar em um aparelho aparece no outro na hora.',
  },
  {
    q: 'Preciso instalar algum aplicativo?',
    a: 'Não. Funciona direto no navegador do iPhone, Android, Windows, Mac e Linux.',
  },
  {
    q: 'Por quanto tempo o conteúdo fica salvo?',
    a: 'O espaço é temporário: tudo é apagado 10 minutos depois que o último aparelho sai. Nada fica guardado em banco de dados.',
  },
  {
    q: 'É seguro?',
    a: 'A conexão é criptografada (HTTPS) e você pode proteger o espaço com senha. Sem senha, quem souber o nome do espaço consegue entrar, então use um nome difícil ou ative a senha para conteúdos sensíveis.',
  },
  {
    q: 'Que tipo de arquivo posso enviar?',
    a: 'Texto, links, imagens, prints (é só colar com Ctrl+V) e qualquer arquivo de até 25 MB.',
  },
]

export function homeJsonLd() {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'copy.',
      url: SITE_URL,
      description: SEO_DESCRIPTION,
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any',
      inLanguage: 'pt-BR',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    },
  ]
}
