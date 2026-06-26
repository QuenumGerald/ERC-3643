# T-REX Tokenization Indexer

A Node.js TypeScript event listener service that indexes ERC-3643 token transfers, checks compliance status, updates block confirmations periodically, and broadcasts live transactions to WebSocket subscribers (e.g., the Next.js tokenization dashboard).

---

## ⚙️ Architecture & Features

1. **WebSocket RPC Connection**: Connects to the Ethereum blockchain via Alchemy's WS protocol using `ethers.js` v6. Handles automatic connection drop recovery.
2. **Dynamic Event Subscription**: Queries the PostgreSQL `deployments` table periodically to fetch active token contract addresses and applies custom filters listening to `Transfer` event logs.
3. **Database Persistence**: Formats and inserts transaction records into the `transfers` table:
   - `id`: Auto-incrementing primary key
   - `tokenAddress`: Address of the security token
   - `from`: Address of the transfer sender
   - `to`: Address of the transfer recipient
   - `value`: Precise raw token amount (uint256 decimal string)
   - `compliant`: Compliance check status (always true for completed ERC-3643 transfers)
   - `txHash`: Transaction hash
   - `block`: Block height
   - `timestamp`: Block time
4. **WebSocket Broadcast**: Runs a local WS server (defaults to port `4000`) broadcasting formatted log events to active client connections in real time.
5. **Periodic Confirmations Update**: Polling task checking the latest block height against stored transfers. Automatically increments confirmations and sets `confirmed = true` once a transfer is 12 blocks deep.
6. **Jest Test Suite**: Thoroughly mocks provider callbacks, database interactions, and broadcast servers to assert proper log extraction.

---

## 📂 Project Structure

```
indexer/
├── src/
│   ├── config/      # Environment variables and configurations
│   ├── services/
│   │   ├── db.ts    # PostgreSQL client pool & queries
│   │   ├── wsServer.ts # WS broadcast server
│   │   └── listener.ts # Ethers.js websocket filters and event listeners
│   └── index.ts     # Main application launcher
├── test/
│   └── indexer.test.ts # Jest mock unit tests
├── jest.config.js   # Jest configurations
├── tsconfig.json    # TypeScript configurations
└── package.json     # Node script declarations
```

---

## 🏁 Quick Start

### 1. Configure Environmental Variables
Copy or declare the following keys inside the root `.env` file of the monorepo:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=tokenization_engine

RPC_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/your-api-key
WS_PORT=4000
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Jest Tests
```bash
npm run test
```

### 4. Start in Development Mode
```bash
npm run dev
```

### 5. Build & Start in Production Mode
```bash
npm run build
npm run start
```
---
