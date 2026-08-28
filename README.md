# RSVP
RSVP is an event guest management application.

**Languages:** [English](#rsvp) | [Português brasileiro](#rsvp-em-português-brasileiro)

An administrator can create events and manage guest lists.
Guests can confirm attendance on a public event page.
The application creates a signed QR code after confirmation.
An administrator can use the QR code for event check-in.

## Main Functions
- Create, change, and delete events.
- Add, change, delete, and import guests.
- Search guests without accent marks.
- Confirm attendance from a public event link.
- Create and download a QR code for each confirmed guest.
- Register a check-in by QR code or by manual selection.
- Undo a check-in.
- Show event and group statistics.

The application uses one administrator account.
It does not provide user accounts, roles, password reset, or event restore.

## System Design

The server is a Fastify application.
The client is a Preact single-page application.
Vite builds the client files.
MongoDB stores events, guests, and check-in logs.

The production server serves the API and the built client files.
The development client uses a proxy for `/api` requests.

| Part | Location | Purpose |
| Server | `src/server` | API routes, authentication, storage, QR code validation, and imports. |
| Client | `src/client` | Administrator pages, public RSVP page, and QR scanner. |
| Shared | `src/shared` | Domain types and text normalization. |
| Tests | `tests` | API, client, QR, import, configuration, and normalization tests. |

`AppStore` defines the storage interface.
`MongoStore` is the production implementation.
`MemoryStore` supports API tests.

## Requirements

- Node.js 22 or later.
- A MongoDB database.
- An administrator user name and password hash.
- Two secret values with at least 32 characters each.

## Install and Configure

Install the package dependencies.

```bash
npm install
```

Create a `.env` file in the project root.
```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=rsvp
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=scrypt$...
SESSION_SECRET=replace-with-a-secret-of-at-least-32-characters
QR_SIGNING_SECRET=replace-with-a-different-secret-of-at-least-32-characters
PUBLIC_BASE_URL=http://127.0.0.1:5173
```

Generate the password hash with this command.
```bash
npm run hash:password
```

Set `ADMIN_PASSWORD_HASH` to the generated value.

Do not use the example secret values in a deployed system.

## Configuration
| Variable | Required | Description |
| --- | --- | --- |
| `MONGODB_URI` | Yes | MongoDB connection string. |
| `MONGODB_DB` | Yes | MongoDB database name. |
| `ADMIN_USERNAME` | Yes | Name for the administrator account. |
| `ADMIN_PASSWORD_HASH` | Yes | Scrypt password hash. |
| `SESSION_SECRET` | Yes | Session signing secret. It must contain at least 32 characters. |
| `QR_SIGNING_SECRET` | Yes | QR signing secret. It must contain at least 32 characters. |
| `PUBLIC_BASE_URL` | Yes | Public base URL for event links. |
| `HOST` | No | Server bind address. The default is `0.0.0.0`. |
| `PORT` | No | Server port. The default is `8080`. |
| `NODE_ENV` | No | Use `production` for deployed systems. |

The server loads `.env` when the file exists.
The server removes one final slash from `PUBLIC_BASE_URL`.

## Run the Application

Start the API server and the client development server.

```bash
npm run dev
```

Use `http://127.0.0.1:5173` for the client.
The API server listens on port `8080`.

Build the application for production.

```bash
npm run build
```

Start the production server after the build completes.

```bash
npm start
```

The build creates `dist/client` and `dist/server`.

## Application Pages

| Path | Access | Purpose |
| --- | --- | --- |
| `/rsvp` | Administrator | Manage events and guests. |
| `/rsvp-confirm` | Administrator | Register and undo check-ins. |
| `/:slug` | Public | Search guests and confirm attendance. |

The public page returns no guests until the search has two characters.
The public search returns no more than 20 guests.

## Administrator Workflow

1. Sign in on an administrator page.
2. Create an event.
3. Add guests or import a guest file.
4. Give the public event link to guests.
5. Open the check-in page during the event.
6. Scan QR codes or select guests for manual check-in.

The system stores deleted events and guests as soft-deleted records.
The system does not provide a restore operation.

## Guest Import

The import route accepts XLSX and CSV files.
The upload limit is one file with a maximum size of 5 MB.

Use one name column and one optional group column.
The name column can use these headings:

- `Convidados`
- `Convidado`
- `Nome`
- `Nomedoconvidado`

The group column can use these headings:

- `Grupo`
- `Tipo`
- `Categoria`

Valid groups are `adulto` and `crianca`.
The importer also accepts plural group names.

The import operation uses preview mode by default.
Send `dryRun=false` only after you resolve all reported row errors.

## QR Code and Check-In

The system creates a signed QR token after guest confirmation.
The token includes the event ID, guest ID, and a stable guest nonce.

The server verifies the token signature during QR check-in.
It also verifies the event ID and guest nonce.
This process rejects a changed or substituted token.

The system records duplicate scans without changing the first check-in time.
Each manual check-in, QR check-in, and undo operation creates a log record.

## API Summary

All API routes start with `/api`.

| Route | Access | Purpose |
| --- | --- | --- |
| `POST /auth/login` | Public | Create an administrator session. |
| `GET /auth/session` | Public | Get the current session state. |
| `POST /auth/logout` | Public | Delete the session cookie. |
| `GET`, `POST /events` | Administrator | List or create events. |
| `PATCH`, `DELETE /events/:id` | Administrator | Change or delete an event. |
| `GET`, `POST /events/:id/guests` | Administrator | List or add guests. |
| `PATCH`, `DELETE /events/:id/guests/:guestId` | Administrator | Change or delete a guest. |
| `POST /events/:id/guests/import` | Administrator | Preview or import a guest file. |
| `POST /events/:id/checkins/manual` | Administrator | Register a manual check-in. |
| `POST /events/:id/checkins/qr` | Administrator | Register a QR check-in. |
| `DELETE /events/:id/checkins/:guestId` | Administrator | Undo a check-in. |
| `GET /public/events/:slug` | Public | Get public event information. |
| `GET /public/events/:slug/guests` | Public | Search public guests. |
| `POST /public/events/:slug/confirm` | Public | Confirm a guest and get a QR token. |

Administrator routes require the `rsvp_session` cookie.
The cookie is HTTP-only and uses `SameSite=Strict`.
The production cookie also uses the `Secure` attribute.
The session expires after 12 hours.

## Security and Limits

- The server uses Helmet security headers.
- The server allows 120 requests per minute by default.
- The login route allows five requests per minute.
- The request body limit is 1 MB.
- The server does not enable CORS.
- Event and guest text has server-side length validation.
- MongoDB stores indexes for event, guest, and check-in queries.

Use HTTPS for every deployed system.

## Quality Checks

Run these commands before deployment.

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

The test suite uses an in-memory store for API tests.
The suite does not require a MongoDB instance.

## License

See [LICENSE](LICENSE).

---

## RSVP em português brasileiro

RSVP é uma aplicação para gerenciamento de convidados de eventos.

Um administrador pode criar eventos e gerenciar listas de convidados.
Os convidados podem confirmar presença em uma página pública do evento.
A aplicação cria um QR Code assinado depois da confirmação.
O administrador pode usar o QR Code para fazer o check-in.

### Funções principais

- Criar, alterar e excluir eventos.
- Adicionar, alterar, excluir e importar convidados.
- Buscar convidados sem exigir acentos.
- Confirmar presença por um link público do evento.
- Criar e baixar um QR Code para cada convidado confirmado.
- Registrar o check-in por QR Code ou por seleção manual.
- Desfazer um check-in.
- Exibir estatísticas do evento e dos grupos.

A aplicação usa uma única conta de administrador.
Ela não oferece contas de usuário, perfis, redefinição de senha nem restauração de eventos.

### Arquitetura do sistema

O servidor é uma aplicação Fastify.
O cliente é uma aplicação single-page em Preact.
O Vite gera os arquivos do cliente.
O MongoDB armazena eventos, convidados e logs de check-in.

O servidor de produção serve a API e os arquivos gerados do cliente.
O cliente de desenvolvimento usa um proxy para as requisições em `/api`.

| Parte | Localização | Finalidade |
| --- | --- | --- |
| Servidor | `src/server` | Rotas da API, autenticação, armazenamento, validação de QR Code e importações. |
| Cliente | `src/client` | Páginas administrativas, página pública de RSVP e scanner de QR Code. |
| Compartilhado | `src/shared` | Tipos do domínio e normalização de texto. |
| Testes | `tests` | Testes da API, do cliente, de QR Code, de importação, de configuração e de normalização. |

`AppStore` define a interface de armazenamento.
`MongoStore` é a implementação usada em produção.
`MemoryStore` é usada nos testes da API.

### Requisitos

- Node.js 22 ou posterior.
- Um banco MongoDB.
- Um nome de usuário de administrador e um hash de senha.
- Dois valores secretos com pelo menos 32 caracteres cada.

### Instalação e configuração

Instale as dependências do pacote.

```bash
npm install
```

Crie um arquivo `.env` na raiz do projeto.

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=rsvp
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=scrypt$...
SESSION_SECRET=replace-with-a-secret-of-at-least-32-characters
QR_SIGNING_SECRET=replace-with-a-different-secret-of-at-least-32-characters
PUBLIC_BASE_URL=http://127.0.0.1:5173
```

Gere o hash da senha com este comando.

```bash
npm run hash:password
```

Defina `ADMIN_PASSWORD_HASH` com o valor gerado.

Não use os valores secretos de exemplo em um sistema implantado.

### Configuração

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `MONGODB_URI` | Sim | String de conexão do MongoDB. |
| `MONGODB_DB` | Sim | Nome do banco de dados MongoDB. |
| `ADMIN_USERNAME` | Sim | Nome da conta de administrador. |
| `ADMIN_PASSWORD_HASH` | Sim | Hash de senha usando scrypt. |
| `SESSION_SECRET` | Sim | Segredo usado para assinar a sessão. Deve conter pelo menos 32 caracteres. |
| `QR_SIGNING_SECRET` | Sim | Segredo usado para assinar QR Codes. Deve conter pelo menos 32 caracteres. |
| `PUBLIC_BASE_URL` | Sim | URL base pública dos links dos eventos. |
| `HOST` | Não | Endereço de bind do servidor. O padrão é `0.0.0.0`. |
| `PORT` | Não | Porta do servidor. O padrão é `8080`. |
| `NODE_ENV` | Não | Use `production` em sistemas implantados. |

O servidor carrega `.env` quando o arquivo existe.
O servidor remove uma barra final de `PUBLIC_BASE_URL`.

### Como executar a aplicação

Inicie o servidor da API e o servidor de desenvolvimento do cliente.

```bash
npm run dev
```

Use `http://127.0.0.1:5173` para acessar o cliente.
O servidor da API escuta na porta `8080`.

Gere o build da aplicação para produção.

```bash
npm run build
```

Inicie o servidor de produção depois que o build terminar.

```bash
npm start
```

O build cria `dist/client` e `dist/server`.

### Páginas da aplicação

| Caminho | Acesso | Finalidade |
| --- | --- | --- |
| `/rsvp` | Administrador | Gerenciar eventos e convidados. |
| `/rsvp-confirm` | Administrador | Registrar e desfazer check-ins. |
| `/:slug` | Público | Buscar convidados e confirmar presença. |

A página pública não retorna convidados até que a busca tenha dois caracteres.
A busca pública retorna no máximo 20 convidados.

### Fluxo do administrador

1. Entre em uma página administrativa.
2. Crie um evento.
3. Adicione convidados ou importe um arquivo de convidados.
4. Envie o link público do evento aos convidados.
5. Abra a página de check-in durante o evento.
6. Escaneie QR Codes ou selecione convidados para fazer o check-in manualmente.

O sistema mantém eventos e convidados excluídos como registros marcados para exclusão lógica.
O sistema não oferece uma operação de restauração.

### Importação de convidados

A rota de importação aceita arquivos XLSX e CSV.
O limite de upload é um arquivo com tamanho máximo de 5 MB.

Use uma coluna de nome e uma coluna opcional de grupo.
A coluna de nome pode usar estes títulos:

- `Convidados`
- `Convidado`
- `Nome`
- `Nomedoconvidado`

A coluna de grupo pode usar estes títulos:

- `Grupo`
- `Tipo`
- `Categoria`

Os grupos válidos são `adulto` e `crianca`.
O importador também aceita os nomes dos grupos no plural.

A operação de importação usa o modo de pré-visualização por padrão.
Envie `dryRun=false` somente depois de corrigir todos os erros de linha informados.

### QR Code e check-in

O sistema cria um token QR assinado depois que o convidado confirma presença.
O token inclui o ID do evento, o ID do convidado e um nonce estável do convidado.

O servidor verifica a assinatura do token durante o check-in por QR Code.
Ele também verifica o ID do evento e o nonce do convidado.
Esse processo rejeita tokens alterados ou substituídos.

O sistema registra leituras duplicadas sem alterar o horário do primeiro check-in.
Cada check-in manual, check-in por QR Code e operação de desfazer cria um registro de log.

### Resumo da API

Todas as rotas da API começam com `/api`.

| Rota | Acesso | Finalidade |
| --- | --- | --- |
| `POST /auth/login` | Público | Criar uma sessão de administrador. |
| `GET /auth/session` | Público | Obter o estado atual da sessão. |
| `POST /auth/logout` | Público | Excluir o cookie da sessão. |
| `GET`, `POST /events` | Administrador | Listar ou criar eventos. |
| `PATCH`, `DELETE /events/:id` | Administrador | Alterar ou excluir um evento. |
| `GET`, `POST /events/:id/guests` | Administrador | Listar ou adicionar convidados. |
| `PATCH`, `DELETE /events/:id/guests/:guestId` | Administrador | Alterar ou excluir um convidado. |
| `POST /events/:id/guests/import` | Administrador | Pré-visualizar ou importar um arquivo de convidados. |
| `POST /events/:id/checkins/manual` | Administrador | Registrar um check-in manual. |
| `POST /events/:id/checkins/qr` | Administrador | Registrar um check-in por QR Code. |
| `DELETE /events/:id/checkins/:guestId` | Administrador | Desfazer um check-in. |
| `GET /public/events/:slug` | Público | Obter informações públicas do evento. |
| `GET /public/events/:slug/guests` | Público | Buscar convidados publicamente. |
| `POST /public/events/:slug/confirm` | Público | Confirmar um convidado e obter um token QR. |

As rotas administrativas exigem o cookie `rsvp_session`.
O cookie é HTTP-only e usa `SameSite=Strict`.
O cookie de produção também usa o atributo `Secure`.
A sessão expira depois de 12 horas.

### Segurança e limites

- O servidor usa cabeçalhos de segurança do Helmet.
- O padrão é de 120 requisições por minuto.
- A rota de login permite cinco requisições por minuto.
- O limite do corpo da requisição é de 1 MB.
- O servidor não habilita CORS.
- O texto de eventos e convidados passa por validação de tamanho no servidor.
- O MongoDB mantém índices para consultas de eventos, convidados e check-ins.

Use HTTPS em qualquer sistema implantado.

### Verificações de qualidade

Execute estes comandos antes da implantação.

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

A suíte de testes usa um armazenamento em memória nos testes da API.
A suíte não exige uma instância do MongoDB.

### Licença

Consulte [LICENSE](LICENSE).