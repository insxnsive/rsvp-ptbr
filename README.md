# RSVP
RSVP is an event guest management application.

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