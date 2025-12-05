# @assegailabs/sdk
[![CI](https://github.com/AssegaiLabs/assegai-sdk/actions/workflows/ci.yaml/badge.svg)](https://github.com/AssegaiLabs/assegai-sdk/actions/workflows/ci.yaml)

SDK for building agents in the [Assegai Agent Sandbox](https://assegailabs.xyz/).

## Installation

```bash
npm install @assegailabs/sdk
```

## Quick Start

```typescript
import { AssegaiSDK } from '@assegailabs/sdk';

// SDK automatically reads ASSEGAI_AGENT_ID and ASSEGAI_AGENT_TOKEN from environment
const sdk = new AssegaiSDK();

async function main() {
  // Log to Assegai UI
  await sdk.info('Agent starting...');

  // Get connected wallet
  const address = await sdk.getWalletAddress('eip155:1');
  await sdk.info(`Connected wallet: ${address}`);

  // Check balance
  const balance = await sdk.getBalance('eip155:1', address);
  await sdk.info(`Balance: ${BigInt(balance)} wei`);

  // Call Claude
  const response = await sdk.callClaude({
    model: 'claude-sonnet-4-5-20250929',
    messages: [{ role: 'user', content: 'Hello!' }],
    max_tokens: 1024,
  });
  
  const text = response.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('');
  
  await sdk.success(`Claude says: ${text}`);
}

main().catch(console.error);
```

## API Reference

### Constructor

```typescript
const sdk = new AssegaiSDK(config?: AssegaiConfig);
```

Configuration options (all optional, defaults to environment variables):
- `apiProxyUrl`: API proxy URL (default: `ASSEGAI_API_PROXY` or `http://host.docker.internal:8765`)
- `agentId`: Agent ID (default: `ASSEGAI_AGENT_ID`)
- `agentToken`: Agent token (default: `ASSEGAI_AGENT_TOKEN`)
- `timeout`: Request timeout in ms (default: 30000)
- `debug`: Enable debug logging (default: false)

### Wallet & Chain Operations

#### `getWalletAddress(chain: ChainId): Promise<Address>`

Get the connected wallet address for a chain.

```typescript
const address = await sdk.getWalletAddress('eip155:1');
```

#### `queryChain<T>(chain: ChainId, method: RpcMethod, params?: unknown[]): Promise<T>`

Execute a JSON-RPC query on a chain.

```typescript
const blockNumber = await sdk.queryChain('eip155:1', 'eth_blockNumber', []);
const balance = await sdk.queryChain('eip155:1', 'eth_getBalance', [address, 'latest']);
```

#### `getBalance(chain: ChainId, address: Address): Promise<string>`

Get ETH balance of an address (returns hex string in wei).

#### `getTransactionCount(chain: ChainId, address: Address): Promise<string>`

Get transaction count (nonce) for an address.

#### `getGasPrice(chain: ChainId): Promise<string>`

Get current gas price (returns hex string in wei).

#### `getBlockNumber(chain: ChainId): Promise<string>`

Get current block number.

#### `isContract(chain: ChainId, address: Address): Promise<boolean>`

Check if an address is a contract.

### Transactions

#### `requestTransaction(request: TransactionRequest): Promise<TransactionHash>`

Request a transaction. **Requires user approval in Assegai UI.**

```typescript
try {
  const txHash = await sdk.requestTransaction({
    chain: 'eip155:1',
    to: '0x742d35Cc6634C0532925a3b844Bc9e7595f...',
    value: '1000000000000000000', // 1 ETH in wei
    data: '0x', // optional
    gasLimit: '21000', // optional
  });
  await sdk.success(`Transaction sent: ${txHash}`);
} catch (error) {
  if (error instanceof TransactionRejectedError) {
    await sdk.warn('User rejected the transaction');
  } else if (error instanceof InsufficientAllowanceError) {
    await sdk.error('Spending allowance not configured');
  }
}
```

### AI/LLM Operations

#### `callClaude(options: ClaudeOptions): Promise<ClaudeResponse>`

Call the Claude API.

```typescript
const response = await sdk.callClaude({
  model: 'claude-sonnet-4-5-20250929',
  messages: [
    { role: 'user', content: 'Analyze this transaction...' }
  ],
  system: 'You are a blockchain analyst.',
  max_tokens: 4096,
  tools: [
    {
      name: 'get_balance',
      description: 'Get wallet balance',
      input_schema: {
        type: 'object',
        properties: {
          address: { type: 'string' }
        },
        required: ['address']
      }
    }
  ],
});
```

#### `callOpenAI(options: OpenAIOptions): Promise<OpenAIResponse>`

Call the OpenAI API.

```typescript
const response = await sdk.callOpenAI({
  model: 'gpt-4',
  messages: [
    { role: 'user', content: 'Hello!' }
  ],
  max_tokens: 1024,
});
```

### Logging

#### `log(level: LogLevel, message: string, data?: object): Promise<void>`

Send a log message to the Assegai UI.

```typescript
await sdk.log('info', 'Processing started', { step: 1 });
```

Convenience methods:
- `sdk.debug(message, data?)` - Debug level (only shown when debug=true)
- `sdk.info(message, data?)` - Info level
- `sdk.warn(message, data?)` - Warning level
- `sdk.error(message, data?)` - Error level
- `sdk.success(message, data?)` - Success level (shown in green)

### Utilities

#### `getAgentId(): string`

Get the agent ID.

#### `isConfigured(): boolean`

Check if the SDK is properly configured.

#### `healthCheck(): Promise<boolean>`

Check if the API proxy is reachable.

## Error Handling

The SDK throws typed errors for different failure scenarios:

```typescript
import {
  AssegaiError,
  AuthenticationError,
  RateLimitError,
  TransactionRejectedError,
  TransactionTimeoutError,
  InsufficientAllowanceError,
  RpcError,
  NetworkError,
  TimeoutError,
  ValidationError,
} from '@assegailabs/sdk';

try {
  await sdk.requestTransaction({ ... });
} catch (error) {
  if (error instanceof TransactionRejectedError) {
    // User clicked "Reject" in the UI
  } else if (error instanceof TransactionTimeoutError) {
    // User didn't respond within 5 minutes
  } else if (error instanceof InsufficientAllowanceError) {
    // Spending allowance not configured for this agent
  } else if (error instanceof RateLimitError) {
    // Too many requests
  } else if (error instanceof AssegaiError) {
    // Other SDK error
    console.log(error.code, error.message);
  }
}
```

## Types

The SDK exports comprehensive TypeScript types:

```typescript
import type {
  // Configuration
  AssegaiConfig,
  
  // Chain types
  ChainId,        // e.g., "eip155:1"
  Address,        // e.g., "0x..."
  TransactionHash,
  HexData,
  
  // Transaction types
  TransactionRequest,
  
  // AI types
  ClaudeModel,
  ClaudeOptions,
  ClaudeResponse,
  OpenAIModel,
  OpenAIOptions,
  OpenAIResponse,
  Message,
  Tool,
  ContentBlock,
  
  // Logging
  LogLevel,
} from '@assegailabs/sdk';
```

## Environment Variables

The SDK reads these environment variables (set automatically by Assegai):

| Variable | Description |
|----------|-------------|
| `ASSEGAI_AGENT_ID` | Unique agent identifier |
| `ASSEGAI_AGENT_TOKEN` | Authentication token |
| `ASSEGAI_API_PROXY` | API proxy URL (default: `http://host.docker.internal:8765`) |

## License

MIT
