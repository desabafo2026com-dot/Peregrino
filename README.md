# Peregrino 🥾

App de apoio para peregrinos que caminham pela Rodovia Presidente Dutra até
Aparecida-SP: cadastro de peregrinos, pontos de apoio no mapa, rotas
seguras, compartilhamento de localização, check-in, certificado de
conclusão e botão de emergência.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind CSS v4)
- **Supabase** (Auth, Postgres, Row Level Security)
- **MapLibre GL** + tiles OpenStreetMap (mapa sem necessidade de chave de API)
- **Vercel** (deploy)

## Funcionalidades (MVP)

- Cadastro/login por e-mail e senha, com dados do peregrino (cidade, grupo,
  já fez o trajeto, data de nascimento, sexo, religião, motivo, dias
  previstos, acompanhamento de carro de apoio).
- Mapa com pontos de apoio (nome, responsável, telefone, horário, serviços,
  contato para doação) — qualquer peregrino autenticado pode cadastrar um novo.
- Página de rotas seguras: lado da rodovia recomendado por trecho e pontos
  de maior risco.
- Botão de emergência fixo com ligação direta para PM (190), PRF (191),
  Bombeiros (193) e SAMU (192).
- Iniciar/finalizar peregrinação, compartilhar localização em tempo real
  (opt-in), check-in em pontos de apoio.
- Certificado de conclusão gerado automaticamente ao finalizar, com código
  de verificação público (`/verificar`).

## Configuração local

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Crie um projeto em [supabase.com](https://supabase.com), copie a **Project URL**
   e a **anon public key** (Project Settings → API) e crie o arquivo `.env.local`:

   ```bash
   cp .env.local.example .env.local
   ```

   Preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

3. No Supabase, abra o **SQL Editor** e execute o conteúdo de
   `supabase/schema.sql` para criar as tabelas, políticas de segurança (RLS)
   e funções.

4. Rode o projeto:

   ```bash
   npm run dev
   ```

## Deploy

O deploy é feito na [Vercel](https://vercel.com), conectado a este
repositório do GitHub. Configure as mesmas variáveis de ambiente
(`NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`) no painel do
projeto na Vercel.

## Próximos passos sugeridos

- Configurar autenticação por telefone (SMS/OTP) via provedor no Supabase
  (ex: Twilio), hoje o cadastro usa e-mail e senha.
- Criar o modelo visual definitivo do certificado (hoje é um modelo simples
  imprimível em PDF pelo navegador).
- Moderação/aprovação de pontos de apoio cadastrados pela comunidade.
- Notificações push para peregrinos próximos de pontos de risco.
