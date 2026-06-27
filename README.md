# 🧬 ERC-3643 (T-REX) Tokenization Platform

An institutional-grade, fully compliant asset tokenization suite implementing the ERC-3643 (T-REX) standard. This suite consists of a REST API deployer engine, a real-time event indexer, and an interactive compliance and operations dashboard.

---

## 🎯 Project Vision & Positioning

Our vision is to become the **"NextAuth", "Supabase" or "PayloadCMS" of regulated tokenization**—a robust, open-source software layer that financial institutions, fintechs, and asset issuers can deploy, customize, and integrate rapidly on top of ERC-3643 without rebuilding the entire technical infrastructure required to exploit on-chain compliance.

### 🏛️ Core Objectives:
*   **Agnostic Integration Layer**: Stay completely agnostic of RPC providers, custody solutions, wallets, and KYC providers, enabling institutions to integrate their existing systems without modifications.
*   **Modern Developer Experience (DevEx)**: Reduce integration time of the ERC-3643 standard from weeks to hours via pre-packaged services and clean REST APIs.
*   **Out-of-the-Box Local Execution**: A zero-overhead local development environment utilizing a shared **SQLite** database, freeing developers from complex Docker or external DB dependencies.
*   **Production Readiness**: Hardened for enterprise deployments with built-in Prometheus observability, real-time Slack/Discord alerting, and Foundry fuzzing.

---

## 📽️ Single Slide Pitch (Problem / Solution / Stack)

```
============================================================================================
|  Institutional Asset Tokenization Platform (ERC-3643 / T-REX)                           |
============================================================================================
| PROBLEM:                                                                                 |
| - Standard ERC-20 tokens lack regulatory compliance features (no KYC/AML on-chain).      |
| - High friction in verifying decentralized identities in real-time before transactions.  |
| - Months of custom backend/indexer development needed just to start a project.           |
|                                                                                          |
| SOLUTION:                                                                                |
| - Permissioned ERC-3643 standard: transfer logic halts if identity claims are invalid.    |
| - Instant automated REST token deployment, state tracking, and live monitoring.          |
| - A free, customizable open-source framework ready to integrate with legacy banking.     |
|                                                                                          |
| ARCHITECTURE STACK:                                                                      |
| - Frontend: Next.js 14 (App Router, Tailwind CSS, SWR, Shadcn/ui)                        |
| - Backend Deployer: Node.js 18, TypeScript, Hardhat, Ethers v6, SQLite / PostgreSQL      |
| - Event Indexer: Node.js, Ethers WebSocket Provider, WS Broadcast, SQLite / PostgreSQL   |
|                                                                                          |
| LIVE DEMO PROTOCOL:                                                                      |
| - Deploy compliant token -> Verify identities -> Mint tokens -> Check live compliance.    |
============================================================================================
```

---

## 🏁 5-Minute Demo Protocol

Follow this simple guide to test the end-to-end flow: from automated deployment to compliance checking and live dashboard updates.

### Step 1: Start the Infrastructure

Both the Tokenization Engine and the Event Indexer share a local SQLite database (`deployments.sqlite`). No Docker or Postgres setup is required for local testing.

1.  **Configure environment files**:
    Ensure the `.env` file at the root of the project has been configured with your public Sepolia RPC URL and a funded Private Key.

2.  **Start the REST API Deployer Engine**:
    ```bash
    cd tokenization-engine
    npm install
    npm run dev
    ```
    *(Runs on http://localhost:3000)*

3.  **Start the Event Indexer**:
    ```bash
    cd ../indexer
    npm install
    npm run dev
    ```
    *(Runs on port 4000, listening for blockchain transfers)*

4.  **Start the Next.js Dashboard**:
    ```bash
    cd ../tokenization-dashboard
    npm install
    npm run dev
    ```
    *(Runs on http://localhost:3001)*

---

### Step 2: Deploy a New Compliant Token

Trigger a token deployment using `curl`. This deploys the token, the identity registry, and the modular compliance contracts:

```bash
curl -X POST http://localhost:3000/deployToken \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <MOCK_ADMIN_JWT>" \
  -d '{
    "name": "Compliant Equity Share",
    "symbol": "CES",
    "initialSupplyCap": "10000000",
    "trustedIssuers": ["0xdacf53Ca661c8d37885D740f77ED6E813Da087e0"],
    "claimTopics": ["0x0000000000000000000000000000000000000000000000000000000000000001"],
    "complianceFlags": ["US_ONLY", "MAX_LIMIT"]
  }'
```

The console will return the newly deployed addresses:
```json
{
  "tokenAddress": "0xB87EBf4dAa7190204401F566d619b89b94Ddc61e",
  "identityRegistry": "0x4AB5a3008550217F246cc71f017ed1AB4569317A",
  "complianceAddress": "0xB9D8856e28f3769f025F26Dec753c05a53ae9783"
}
```

---

### Step 3: Open the Dashboard & Register Investors

1.  Navigate to the **Dashboard** at `http://localhost:3001` and log in.
2.  Go to the **Investors** tab.
3.  Register Alice (`0xdacf53Ca661c8d37885D740f77ED6E813Da087e0`) and Bob (`0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`).
4.  Set Alice's KYC claim check to "Active". Keep Bob's KYC check empty (unverified).

---

### Step 4: Mint & Test Compliance Refusal

1.  Go to the **Actions** tab on the Dashboard.
2.  Mint **1,000 CES** tokens to Alice. Since Alice's identity is verified, the transaction succeeds.
3.  Attempt to transfer **200 CES** tokens from Alice to Bob:
    *   **Result**: The transaction reverts.
    *   **Dashboard Alert**: A red toast notification instantly pops up in the bottom-right corner: `Transfer Refused: Bob does not possess a valid KYC claim.`

---

### Step 5: Verify Bob's KYC & Re-attempt Transfer

1.  Navigate back to the **Investors** tab and add the KYC claim to Bob's address.
2.  Re-attempt the transfer of **200 CES** from Alice to Bob.
    *   **Result**: The transaction completes successfully.
    *   **Indexer & Live Feed**: The event is captured by the Indexer, saved to the database, and pushed to the **Transfers** feed on the Dashboard in real time.

---

## 🛠️ Monorepo Projects

*   [**`tokenization-engine`**](./tokenization-engine): REST API to deploy and manage contracts, backed by hardhat.
*   [**`indexer`**](./indexer): Blockchain subscriber that indexes event logs and broadcasts them using WebSockets, including custom Prometheus metrics.
*   [**`tokenization-dashboard`**](./tokenization-dashboard): Next.js dashboard UI for administrative controls and live transfers streaming.
