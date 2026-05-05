# RSVP

Eu construí este projeto para resolver um fluxo completo de RSVP de eventos com check-in na entrada, sem separar frontend e backend em apps diferentes. A ideia é ter:

- painel administrativo protegido para criar e operar eventos;
- página pública por slug para convidado confirmar presença;
- QR Code assinado para check-in;
- check-in manual e por QR no mesmo painel de operação.

Não é um boilerplate genérico: os fluxos de RSVP, confirmação de convidado, importação de lista e validação de entrada estão codificados de ponta a ponta.

## Stack e por que cada peça está aqui

- Preact: UI leve com API compatível com React para telas de admin, RSVP público e check-in.
- Vite: dev server rápido, build do cliente e proxy para API em desenvolvimento.
- Tailwind CSS (via @tailwindcss/vite): estilos utilitários e design system simples direto no código.
- Fastify: servidor HTTP da API com plugins de segurança e multipart.
- MongoDB Driver: persistência principal com índices explícitos e operações simples.
- XLSX: importação de convidados por planilha/csv.
- @zxing/browser: leitura de QR pela câmera no navegador.
- qrcode: geração do PNG de QR para o convidado.
- TypeScript: contratos compartilhados e tipagem forte no cliente/servidor.
- Vitest + Testing Library + jsdom: testes de API, funções de domínio e um smoke test da UI.
- ESLint + typescript-eslint: consistência de padrões e regras de TS (inclusive banindo any explícito).

Arquivos de configuração relevantes:

- vite.config.ts: plugins Preact/Tailwind, proxy de /api para 127.0.0.1:8080, build em dist/client, ambiente de teste jsdom.
- tsconfig.server.json: build de backend para dist/server em NodeNext.
- tsconfig.client.json: tipagem do cliente + shared + testes tsx.
- eslint.config.js: baseline JS/TS + regras específicas para o projeto.
- scripts/dev.mjs: sobe API e web em paralelo, com tratamento de encerramento para Windows e Unix.

## Arquitetura

### src/server

- index.ts: bootstrap. Carrega config, cria store Mongo, monta app Fastify e faz listen.
- config.ts: carrega .env quando existir, valida obrigatoriedade de variáveis e segredos mínimos (>= 32 chars).
- app.ts: compõe a aplicação Fastify, registra plugins de segurança, rotas e static files.
- db.ts: cria MongoClient, conecta e garante índices.
- store.ts: contrato de persistência (AppStore) e estatísticas.
- mongoStore.ts: implementa AppStore no MongoDB.
- memoryStore.ts: implementa AppStore em memória (usado nos testes de API).
- auth.ts: hash/verificação de senha com scrypt e sessão assinada por HMAC em cookie.
- qr.ts: assinatura/validação de token QR + nonce estável por convidado.
- importGuests.ts: parser de planilha com normalização de cabeçalho e validação por linha.
- routes/: separa domínios de endpoint (auth, events, public, checkins) e helpers comuns.

### src/client

- App.tsx: concentra roteamento por window.location.pathname e os principais fluxos de UI.
- api.ts: camada única de chamada HTTP, com tratamento padronizado de erro.
- types.ts: contratos do cliente para requests/responses.
- components/QrCodeCard.tsx: renderiza QR em data URL e permite baixar PNG.
- components/ScannerPanel.tsx: modal fullscreen de scanner com ZXing.
- styles.css: base visual e animações.

### src/shared

- types.ts: modelos compartilhados (evento, convidado, logs, stats, import).
- normalize.ts: normalização de nome/cabeçalho/grupo para busca e importação.

### tests

- api.test.ts: cobre autenticação, criação de evento, RSVP público, check-in QR, duplicidade e undo.
- importGuests.test.ts, normalize.test.ts, qr.test.ts, config.test.ts: garantem comportamento de utilitários e validações de config.
- clientApi.test.ts: confirma headers corretos da camada HTTP do cliente.
- App.test.tsx: valida fluxo inicial de tela de login quando não autenticado.

## Como as partes se conectam

1. Admin autentica em /api/auth/login e recebe cookie HTTP-only assinado.
2. Admin cria evento em /api/events; backend gera slug aleatório único.
3. Admin cadastra convidados manualmente ou via importação (/api/events/:id/guests/import).
4. Convidado acessa a URL pública (/<slug>), busca nome e confirma presença.
5. Backend grava RSVP e retorna token QR assinado.
6. No check-in (/rsvp-confirm), operador valida entrada manualmente ou por QR.
7. Cada check-in cria log (checkinLogs) e atualiza estatísticas em tempo real.

## Decisões de implementação que importam

- Contrato de persistência por interface (AppStore): as rotas não dependem de Mongo diretamente. Isso simplifica teste isolado com MemoryStore.
- Soft delete para evento/convidado: exclusão não remove documento, apenas marca timestamp (deletedAt).
- Busca accent-insensitive: nomes são normalizados e indexados (normalizedName) para busca previsível em português.
- RSVP não gera QR arbitrário por request: nonce estável por par eventId+guestId e hash armazenado no convidado para bloquear token substituído.
- Check-in com detecção de duplicidade: segunda leitura do mesmo convidado não falha, mas sinaliza duplicate: true.
- Importação com dry-run: revisa erros antes de inserir, no mesmo endpoint com dryRun.
- Sem biblioteca de roteamento no cliente: o app usa pathname diretamente (/rsvp, /rsvp-confirm, /<slug>), mantendo deploy simples em origem única.

## Segurança e operação

- Helmet com CSP definida explicitamente.
- Rate limit global e rate limit mais restrito no login.
- Cookie de sessão com httpOnly, sameSite=strict e secure em produção.
- Upload multipart limitado a 1 arquivo e 5 MB.
- Segredos de sessão e QR obrigatoriamente longos.
- Build de produção serve frontend estático e API no mesmo processo Fastify.

## Pontos não óbvios para primeira leitura

- O servidor só registra static files se encontrar index.html no caminho esperado de build; sem build do cliente, ele atua só como API.
- O projeto está preparado para um único usuário admin definido por variável de ambiente (não existe entidade de usuário no banco).
- Existe estrutura de logs de check-in, mas neste código não há endpoint para listá-los.
- O README anterior menciona secret manager em produção, mas o código também carrega .env local automaticamente quando o arquivo existe.

## Comandos realmente usados neste projeto

```bash
npm run dev
npm run build
npm start
npm run typecheck
npm run lint
npm test
npm run hash:password -- "sua-senha"
```

Variáveis esperadas estão em .env.example.
