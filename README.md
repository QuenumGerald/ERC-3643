# 🧬 ERC-3643 (T-REX) Tokenization Platform

An institutional-grade, fully compliant asset tokenization monorepo implementing the ERC-3643 standard. This suite consists of an API deployer, an automatic blockchain event indexer, and an interactive real-time compliance dashboard.

---

## 📽️ Single Slide Pitch (Problem / Solution / Stack)

```
============================================================================================
|  Institutional Asset Tokenization Platform (ERC-3643 / T-REX)                           |
============================================================================================
| PROBLEM:                                                                                 |
| - Standard ERC-20 tokens lacks regulatory compliance features (no KYC/AML on-chain limits). |
| - High friction in verifying decentralized identities in real-time before transactions.  |
|                                                                                          |
| SOLUTION:                                                                                |
| - Permissioned ERC-3643 standard: transfer logic halts if identity claims are invalid.    |
| - Instant automated REST token deployment, state tracking, and live monitoring.          |
|                                                                                          |
| ARCHITECTURE STACK:                                                                      |
| - Frontend: Next.js 14 (App Router, Tailwind CSS, SWR, Shadcn/ui)                        |
| - Backend Deployer: Node.js 18, TypeScript, Hardhat, Ethers v6, PostgreSQL               |
| - Event Indexer: Node.js, Ethers WebSocket Provider, WS Broadcast, PostgreSQL            |
|                                                                                          |
| LIVE DEMO PROTOCOL:                                                                      |
| - Deploy compliant token -> Verify identities -> Mint tokens -> Check live compliance.    |
============================================================================================
```

---

## 🏁 5-Minute Demo Protocol

Follow this simple guide to test the end-to-end flow: from automated deployment to compliance checking and live dashboard updates.

### Step 1: Start the Infrastructure
Make sure your PostgreSQL database is running, then boot the three services.

1. **Start the REST API Deployer Engine**:
   ```bash
   cd tokenization-engine
   npm install
   npm run dev
   ```
   *(Running on http://localhost:3000)*

2. **Start the Event Indexer**:
   ```bash
   cd indexer
   npm install
   npm run dev
   ```
   *(Running on port 4000, listening for blockchain transfers)*

3. **Start the Next.js Dashboard**:
   ```bash
   cd tokenization-dashboard
   npm install
   npm run dev
   ```
   *(Running on http://localhost:3001)*

---

### Step 2: Deploy a New Compliant Token
Trigger a token deployment using `curl`. This deploys the token, the identity registry, and the modular compliance contracts:

```bash
curl -X POST http://localhost:3000/deployToken \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -d '{
    "name": "Compliant Equity Share",
    "symbol": "CES",
    "initialSupplyCap": "10000000",
    "trustedIssuers": ["0x70997970C51812dc3A010C7d01b50e0d17dc79C8"],
    "claimTopics": ["0x0000000000000000000000000000000000000000000000000000000000000001"],
    "complianceFlags": ["US_ONLY", "MAX_LIMIT"]
  }'
```

The console will return the newly deployed addresses:
```json
{
  "tokenAddress": "0x587C609DFf2E0210cC02E62581CE461e7fAF3D50",
  "identityRegistry": "0x860C79d993888009083443C0E503aB8B3318E684",
  "complianceAddress": "0x59260070D2F59f248d17eED806198856a09206eA"
}
```

---

### Step 3: Open the Dashboard & Register Investors
1. Navigate to the **Dashboard** at `http://localhost:3001` and log in.
2. Go to the **Investors** tab.
3. Register Alice (`0x70997970C51812dc3A010C7d01b50e0d17dc79C8`) and Bob (`0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`).
4. Set Alice's KYC claim check to "Active". Keep Bob's KYC check empty (unverified).

---

### Step 4: Mint & Test Compliance Refusal
1. Go to the **Actions** tab on the Dashboard.
2. Mint **1,000 CES** tokens to Alice. Since Alice's identity is verified, the transaction succeeds.
3. Attempt to transfer **200 CES** tokens from Alice to Bob:
   * **Result**: The transaction reverts.
   * **Dashboard Alert**: A red toast notification instantly pops up in the bottom-right corner: `Transfer Refused: Bob does not possess a valid KYC claim.`

---

### Step 5: Verify Bob's KYC & Re-attempt Transfer
1. Navigate back to the **Investors** tab and add the KYC claim to Bob's address.
2. Re-attempt the transfer of **200 CES** from Alice to Bob.
   * **Result**: The transaction completes successfully.
   * **Indexer & Live Feed**: The event is captured by the Indexer, saved to the database, and pushed to the **Transfers** feed on the Dashboard in real time.

---

## 🛠️ Monorepo Projects

*   [**`tokenization-engine`**](./tokenization-engine): REST API to deploy the contracts (Hardhat, Ethers v6).
*   [**`indexer`**](./indexer): Blockchain subscriber that indexes event logs and broadcasts them.
*   [**`tokenization-dashboard`**](./tokenization-dashboard): Next.js dashboard UI for administrative mint/burn/freeze controls and live transfers stream.
