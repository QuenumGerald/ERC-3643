# Tokenization Engine Microservice

A TypeScript microservice designed to deploy and manage compliance-based tokenized securities following the **ERC-3643 (T-REX)** standard.

## Tech Stack
- **Runtime**: Node.js 18 + TypeScript
- **Ethereum Interactions**: Ethers.js v6 + Hardhat
- **API Framework**: Express
- **Validation**: Zod
- **Database**: PostgreSQL (pg pool)
- **Containerization**: Docker & Docker Compose

---

## Folder Structure
```
tokenization-engine/
├── src/
│   ├── app.ts                  # Server initialization & middleware wiring
│   ├── config/
│   │   └── index.ts            # Typed Configuration Manager
│   ├── db/
│   │   ├── index.ts            # PostgreSQL pool and schema creation
│   │   └── seed.ts             # Seeding database & generating JWT testing tokens
│   ├── middlewares/
│   │   └── auth.ts             # JWT authentication and authorization middleware
│   ├── routes/
│   │   └── token.ts            # /deployToken route and Zod parameter validation
│   ├── services/
│   │   ├── db.ts               # Database service (persists deployments)
│   │   ├── deployer.ts         # Hardhat/Ethers deployer with nonces, gas retries & confirmations
│   │   └── ipfs.ts             # Metadata artifact generator and mock IPFS publisher
│   └── types/
│       └── index.ts
├── test/
│   └── deploy.test.ts          # End-to-end deployment, minting & transfer compliance tests
├── Dockerfile                  # Production build configuration
├── docker-compose.yml          # Local orchestration for PostgreSQL and API
├── .env.example                # Example configuration template
├── tsconfig.json               # TypeScript compiler options
└── hardhat.config.ts           # Hardhat development setup linking parent contracts
```

---

## Environment Variables

Create a `.env` file in the root of the `tokenization-engine/` directory:

```env
# Application Config
PORT=3000
NODE_ENV=development
JWT_SECRET=super-secret-key-change-in-production

# PostgreSQL Config
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=tokenization_engine

# Blockchain Config
RPC_URL=http://127.0.0.1:8545
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
TREX_FACTORY_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

---

## Getting Started

### 1. Installation
Install the package dependencies:
```bash
npm install
```

### 2. Compile Contracts
Compile the shared Solidity smart contracts (read from the parent directory):
```bash
npm run compile
```

### 3. Start PostgreSQL and Seed
Start PostgreSQL (or run it via docker-compose) and initialize/seed the database:
```bash
# Seed table and generate test JWTs
npm run db:seed
```

### 4. Running the App
Start in development mode:
```bash
npm run dev
```

Build and run in production mode:
```bash
npm run build
npm start
```

---

## API Documentation

### POST `/api/deployToken`

Deploys a new T-REX Token Suite.

- **Headers**:
  - `Authorization: Bearer <JWT_TOKEN>` (Must contain role `ADMIN` or `ISSUER`)
  
- **Body (`application/json`)**:
  ```json
  {
    "name": "Acme Equity Token",
    "symbol": "ACME",
    "initialSupplyCap": "1000000000000000000000000",
    "trustedIssuers": ["0x70997970C51812dc3A010C7d01b50e0d17dc79C8"],
    "claimTopics": ["0x0000000000000000000000000000000000000000000000000000000000000001"],
    "complianceFlags": {
      "maxBalance": "50000",
      "countryWhitelist": ["FR", "US"]
    }
  }
  ```

- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Token deployed successfully",
    "data": {
      "tokenAddress": "0x5395...",
      "identityRegistry": "0x8F3a...",
      "complianceAddress": "0xCd12...",
      "txHash": "0x98f...",
      "blockNumber": 1422,
      "ipfs": {
        "hash": "QmPZ...",
        "url": "https://ipfs.io/ipfs/QmPZ...",
        "localPath": "/app/published/1337_0x5395...json"
      }
    }
  }
  ```

- **Error Responses**:
  - `400 Bad Request`: Validation failure on input parameters.
  - `401 Unauthorized`: Missing or invalid JWT.
  - `403 Forbidden`: Insufficient role permission.
  - `500 Internal Server Error`: Deployer transaction failure.

---

## Running E2E & Hardhat Tests
The suite validates contract compilation, token deployment, minting, transfer block without registry identity, and successful transfer upon KYC verification.

```bash
# Start a local hardhat node in another terminal:
# npx hardhat node
# Then run:
npm run test
```

---

## Running with Docker

Start PostgreSQL and the microservice together:
```bash
docker-compose up --build
```
This automatically runs database migrations and sets up all configurations.
