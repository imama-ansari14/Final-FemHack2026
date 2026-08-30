# SupportFlow

An AI-assisted customer support desk built for the AI Factory 2.0 hackathon (Task D).
Stack: **Next.js 14 (App Router) + MongoDB + Socket.IO + Google Gemini API**.

Customer submits ticket → Gemini AI triages it → Agent reviews/edits → Agent replies → Ticket resolved, all in real time.

---

## 1. What's inside

```
supportflow/
  app/                    Pages (customer, agent) + API routes (app/api/**)
  components/             Reusable UI: Navbar, ChatBox, badges, cards...
  lib/                     db.js, auth.js, gemini.js, emitSocket.js, utils.js
  models/                  Mongoose schemas: User, Ticket, Message
  scripts/seed.js          Creates demo login accounts
  server.js                Custom server that runs Next.js + Socket.IO together
```

**Roles:** `customer` (creates tickets, chats), `agent` (reviews AI triage, replies, resolves), `admin` (sees everything — create manually, see step 6).

---

## 2. Beginner setup — step by step

You need three things before the app will run: **Node.js**, a **MongoDB database**, and a **Gemini API key**.

### Step A — Install Node.js
Download and install Node.js 18 or newer from https://nodejs.org (the "LTS" version). This also installs `npm`, which you'll use to install the project's packages.

### Step B — Get a free MongoDB database (MongoDB Atlas)
1. Go to https://www.mongodb.com/cloud/atlas/register and create a free account.
2. Create a new **free (M0) cluster** — just click through the defaults.
3. Under **Database Access**, create a database user with a username and password (write these down).
4. Under **Network Access**, click **Add IP Address** → **Allow access from anywhere** (`0.0.0.0/0`) — fine for a hackathon demo.
5. Click **Connect** → **Drivers**, and copy the connection string. It looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Replace `<username>` and `<password>` with the ones you created, and add `/supportflow` before the `?` so it points at a database named `supportflow`:
   ```
   mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/supportflow?retryWrites=true&w=majority
   ```
   This full string is your `MONGODB_URI`.

### Step C — Get a Gemini API key
1. Go to https://aistudio.google.com/app/apikey
2. Sign in with a Google account and click **Create API key**. It's free for moderate usage.
3. Copy the key.

> ⚠️ **Important — about the key you shared with me earlier:** if you ever paste an API key into a chat, email, or public place, treat it as compromised. Go back to Google AI Studio, **delete/rotate that key**, and generate a brand new one to use below. Never commit a real key to GitHub.

### Step D — Configure the project
1. Unzip the project and open a terminal inside the `supportflow` folder.
2. Copy the example env file:
   ```bash
   cp .env.example .env.local
   ```
3. Open `.env.local` in a text editor and fill in:
   ```
   MONGODB_URI=<your connection string from Step B>
   JWT_SECRET=<any long random string — e.g. generate one at https://generate-secret.vercel.app/32>
   GEMINI_API_KEY=<your NEW key from Step C>
   PORT=3000
   ```
   `.env.local` is already in `.gitignore`, so it will never be committed to GitHub.

### Step E — Install & run
```bash
npm install
npm run seed     # creates two demo accounts (see below)
npm run dev
```
Open http://localhost:3000 — you should see the login page.

**Demo credentials (created by `npm run seed`):**
| Role     | Email             | Password    |
|----------|-------------------|-------------|
| Customer | customer@demo.com | password123 |
| Agent    | agent@demo.com    | password123 |

You can also just click **Sign up** and create your own accounts (choose "customer" or "agent" on the form).

---

## 3. How the pieces connect (plain-English backend explanation)

Think of it as three separate services talking to each other:

1. **Your browser (frontend)** — the React pages under `app/`. When you click "Submit ticket," it calls `fetch("/api/tickets", { method: "POST", ... })`.
2. **Your Next.js server (backend)** — the files under `app/api/**/route.js`. Next.js turns each `route.js` into a real backend endpoint automatically. There's no separate backend server to run — it's the same `npm run dev` process.
3. **MongoDB (database)** — lives in the cloud (Atlas). `lib/db.js` opens a connection using your `MONGODB_URI` the first time any API route needs it, and reuses that same connection afterward.

**Why is there a `server.js` instead of just `next dev`?**
Real-time features (chat messages appearing instantly, status changes without refreshing) need **Socket.IO**, which needs a long-lived server process it can attach to. `server.js` starts one plain Node HTTP server, hands normal page/API requests to Next.js, and also attaches Socket.IO to that *same* server. That's why you run `npm run dev` (which runs `node server.js`), not the default `next dev`.

**The AI call, step by step (`lib/gemini.js`):**
1. Customer submits the form → hits `POST /api/tickets`.
2. That route calls `triageTicket()` in `lib/gemini.js`, which sends the subject + description to the Gemini API **from the server**, using `GEMINI_API_KEY` from `.env.local`. The key never touches the browser.
3. Gemini returns a suggested category, priority, and one-sentence summary.
4. We save the ticket with those AI suggestions attached, but mark `reviewedByAgent: false`.
5. If Gemini is down, times out, or returns something unparseable, `triageTicket()` returns a safe fallback (`Category: General, Priority: Medium`) instead of throwing — so ticket creation never breaks because of the AI.
6. When an agent opens the ticket, they see the original AI suggestion *and* editable fields. Saving changes sets `reviewedByAgent: true` — that's the "human review" requirement.

**Real-time, step by step (`server.js` + `lib/emitSocket.js` + `lib/socketClient.js`):**
- Every open ticket page joins a "room" named `ticket:<id>` (see `ChatBox.js`).
- When someone sends a message or an agent changes status, the API route calls `emitToTicket(ticketId, ...)`, which broadcasts to everyone in that room instantly — no page refresh needed.
- Agents' dashboards join an `agents` room and get notified whenever a ticket is created or updated, so the queue updates live too.

**Authentication, step by step:**
- Passwords are hashed with `bcrypt` before being stored — the plain password is never saved.
- On login/register, the server signs a JWT (a signed token containing your user id + role) and stores it in an **httpOnly cookie** — JavaScript in the browser can't read or steal it, which is safer than `localStorage`.
- Every protected API route reads that cookie, verifies the JWT, and checks the user's role before doing anything (see `getUserFromRequest` in `lib/auth.js`).

---

## 4. Data model

**User**
| Field | Type | Notes |
|---|---|---|
| name | String | |
| email | String | unique |
| passwordHash | String | bcrypt hash, never plain text |
| role | String | `customer` \| `agent` \| `admin` |

**Ticket**
| Field | Type | Notes |
|---|---|---|
| ticketNumber | String | unique, e.g. `TKT-2026-48213` |
| subject, description | String | from customer |
| customer | ObjectId → User | |
| assignedAgent | ObjectId → User \| null | |
| category | Enum | Billing / Technical / Account / Shipping / General |
| priority | Enum | Low / Medium / High |
| summary | String | human-confirmed (may equal AI's) |
| status | Enum | New → Assigned → In Progress → Resolved |
| aiSuggestion | Object | original AI output + `reviewedByAgent` flag, kept for audit |
| resolutionNote | String | required to mark Resolved |
| resolvedAt | Date | |

**Message**
| Field | Type | Notes |
|---|---|---|
| ticket | ObjectId → Ticket | |
| sender | ObjectId → User | |
| senderRole | Enum | customer / agent / admin |
| body | String | |

---

## 5. API summary

| Method & path | Who | What |
|---|---|---|
| POST `/api/auth/register` | anyone | create account, sets login cookie |
| POST `/api/auth/login` | anyone | log in, sets login cookie |
| POST `/api/auth/logout` | anyone | clears cookie |
| GET `/api/auth/me` | anyone | current logged-in user (or null) |
| GET `/api/tickets` | customer/agent | list tickets scoped to role |
| POST `/api/tickets` | customer | create ticket → runs AI triage |
| GET `/api/tickets/:id` | owner/assigned agent | ticket + message history |
| PATCH `/api/tickets/:id` | agent | edit AI-reviewed fields, and/or claim ticket |
| PATCH `/api/tickets/:id/status` | assigned agent | change status / resolve / reopen |
| POST `/api/tickets/:id/messages` | owner/assigned agent | send a chat message |
| GET `/api/stats` | agent/admin | dashboard counts + avg resolution time |

Socket events: `join-ticket`, `leave-ticket`, `join-agents`, `typing`, `message:new`, `ticket:new`, `ticket:updated`.

---

## 6. Business rules implemented
- Auth required for all ticket routes; customers only see their own tickets; agents can only edit/message tickets assigned to them (or unassigned ones, to claim them).
- Resolved tickets are locked (no status change, no new messages) until explicitly **reopened**.
- Priority is restricted to Low/Medium/High at the schema and API level.
- AI output is validated (category/priority checked against an allow-list) before it's ever saved.
- The Gemini API key is only read in server-side files (`lib/gemini.js`), never shipped to the browser.
- A ticket cannot be marked Resolved without a non-empty resolution note.

To make someone an **admin**, either edit the user's `role` field directly in MongoDB Atlas (Collections → users), or seed one in `scripts/seed.js`.

---

## 7. Deployment notes

Because this app uses a **custom `server.js`** for Socket.IO, it needs a host that runs a persistent Node process — not a pure serverless platform.

- **Recommended (free tier friendly): Render.com or Railway.app.**
  1. Push this repo to GitHub.
  2. Create a new "Web Service" from your repo.
  3. Build command: `npm install && npm run build`
  4. Start command: `npm start`
  5. Add the same environment variables from `.env.local` (`MONGODB_URI`, `JWT_SECRET`, `GEMINI_API_KEY`) in the host's dashboard.
- **Vercel** can host the Next.js pages/API routes, but its serverless functions don't support long-lived Socket.IO connections the way `server.js` needs — avoid it unless you split Socket.IO into a separate small service.
- Whichever host you use, make sure MongoDB Atlas's Network Access allows connections from it (or keep `0.0.0.0/0` for the demo).

---

## 8. AI tools declaration
- **Google Gemini API** (`gemini-2.0-flash`) — used server-side for ticket triage (category, priority, one-sentence summary), with a safe non-AI fallback if the API is unavailable.
