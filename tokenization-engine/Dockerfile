FROM node:18-alpine

WORKDIR /app

# Copy the parent's contracts (required for hardhat compilation in the parent directory context)
COPY contracts /contracts

# Copy the microservice package files
COPY tokenization-engine/package*.json /app/

# Install dependencies
RUN npm ci

# Copy the rest of the microservice source code
COPY tokenization-engine /app/

# Compile Hardhat contracts and build TypeScript
# Note: Since WORKDIR is /app, the relative path '../contracts' in hardhat config resolves to '/contracts'
RUN npx hardhat compile
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/src/app.js"]
