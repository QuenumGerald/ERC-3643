# T-REX Tokenization Dashboard Walkthrough

We have created the `tokenization-dashboard` Next.js 14 project under the workspace. Below is the detailed architecture and file walkthrough.

---

## 📂 Core Folder Mapping

The frontend project is structured as follows:

```
tokenization-dashboard/
├── cypress/                    # E2E test specs (add/edit, navigate, configure rules)
├── src/
│   ├── app/
│   │   ├── (auth)/             # Route group for unauthenticated access
│   │   │   └── login/          # Sleek glassmorphic login screen
│   │   ├── (dashboard)/        # Route group for authenticated workspace
│   │   │   ├── investors/      # Paginated identity grid & add/edit form
│   │   │   ├── transfers/      # Live WebSocket transfers stream & alerts
│   │   │   ├── actions/        # Mint/Burn triggers & batch CSV dropzone
│   │   │   ├── settings/       # Whitelist configuration & claim topics
│   │   │   └── layout.tsx      # Sidebar navigation & toast injection wrapper
│   │   ├── globals.css         # HSL variable colors dark-slate theme
│   │   ├── layout.tsx          # Main html frame
│   │   └── page.tsx            # Initial load auto-redirect utility
│   ├── components/
│   │   ├── ui/                 # Failsafe Shadcn component library
│   │   └── navigation.tsx      # Top bar navigation & logout cookie handler
│   ├── hooks/
│   │   └── graphql.ts          # SWR hook wrappers, local-storage mock sync
│   └── middleware.ts           # Route protector checking cookie token presence
├── cypress.config.ts           # Cypress framework setup
├── Dockerfile                  # Multi-stage production build (build -> run)
└── README.md                   # Command instructions & documentation
```

---

## ⚡ Key Implementations & Logics

### 1. Route Guarding (`src/middleware.ts`)
Validates whether the user's browser has an active `auth_token` cookie. Redirects unauthenticated requests to `/login` and blocks logged-in users from accessing the login panel.

### 2. SWR Data Fetcher fallbacks (`src/hooks/graphql.ts`)
To make the dashboard fully interactive and mock integration simple, the data fetching queries check and persist records in `localStorage`. They automatically invalidate cache using SWR's `mutate` when mutations like `addInvestorMutation` are fired.

### 3. Reconnectable WebSocket Client (`src/app/(dashboard)/transfers/page.tsx`)
Constructs a native `WebSocket` stream that listens to transactional events. In case the connection terminates, it starts an automatic reconnect timer that triggers `connectWebSocket()` every 3 seconds until communication is re-established. It also generates random simulated events when offline to keep the feed dynamic.

### 4. Interactive File Importer (`src/app/(dashboard)/actions/page.tsx`)
Uses HTML5 drag-and-drop interfaces to parse dropped `.csv` files. It converts the spreadsheet lines directly into typed `Investor` structures, provides a grid preview, and pushes the registry batch onto the database.

---

## 🧪 Cypress E2E Testing Script

The test file `cypress/e2e/tokenization.cy.ts` covers the full user journey:
1. Visited `/investors` -> verifies redirect to `/login` works.
2. Performs mock login -> redirects to dashboard.
3. Fills and submits the register investor form -> asserts success toast and verifies presence in the paginated grid.
4. Toggles wallet freeze state -> verifies state changes in column badges.
5. Accesses Actions and opens the token Mint dialog.
6. Accesses Settings and adds a new trusted issuer.
