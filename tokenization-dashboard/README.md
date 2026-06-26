# T-REX Tokenization Dashboard

A modern, high-fidelity **Next.js 14** dashboard (App Router, TypeScript, Tailwind CSS, shadcn/ui) designed for managing, auditing, and configuring compliance rules for ERC-3643 (T-REX) security tokens.

---

## 🚀 Features

1. **Identity Registry (`/investors`)**: Interactive paginated table showing investor wallets, KYC dates, compliance status, and freeze states. Includes filtering, sorting, and single-click CSV registry export.
2. **WebSocket Event Stream (`/transfers`)**: Real-time event log tracking block transactions (`Transfer` and `ComplianceTransfer` events). Auto-reconnects on websocket drops, and displays visual alerts for compliance rejections.
3. **Admin Token Operations (`/actions`)**: Inline dialog triggers for token minting and burning, alongside a batch CSV importer utilizing drag-and-drop file parsing.
4. **Compliance Management (`/settings`)**: Interface to modify active compliance flags, trusted claim issuer signing keys, and expected claim topics.
5. **Secure Authentication Middleware**: Protects client-side paths using JWT role authorization parsed from HTTP cookies.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS & shadcn/ui
- **State & Data Fetching**: SWR (React Query style) with local-storage fallback for serverless demo reliability
- **Testing**: Cypress E2E testing framework
- **Orchestration**: Multi-stage Docker production deployment

---

## 🏁 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file at the root:
```env
NEXT_PUBLIC_GRAPHQL_ENDPOINT=http://localhost:4000/graphql
NEXT_PUBLIC_WS_ENDPOINT=ws://localhost:4000/events
```

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🧪 Testing (Cypress E2E)

Ensure the development server is running on port 3000 before starting tests.

- **Run Tests (Headless mode)**:
  ```bash
  npm run test:e2e
  ```
- **Open Test Runner (Interactive mode)**:
  ```bash
  npm run test:e2e:open
  ```

---

## 📦 Production & Docker Deployment

### Local Production Build
```bash
npm run build
npm run start
```

### Docker Multi-Stage Build
Build the container:
```bash
docker build -t trex-dashboard .
```

Run the container:
```bash
docker run -p 3000:3000 trex-dashboard
```
---

## 📁 Project Structure

```
├── cypress/               # Cypress E2E spec suite
├── src/
│   ├── app/               # Next.js pages and routes
│   │   ├── (auth)/        # Unauthenticated pages (Login)
│   │   └── (dashboard)/   # Layout protected dashboard routes
│   ├── components/        # shadcn components (Table, Dialog, Button)
│   ├── hooks/             # SWR GraphQL queries and mutations
│   ├── lib/               # Utility functions (cn tailwind merge)
│   └── middleware.ts      # Authentication guard
```
