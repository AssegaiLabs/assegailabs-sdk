/**
 * @assegailabs/sdk - Main Client
 * 
 * The AssegaiSDK class provides the main interface for agents to interact
 * with the Assegai host environment, including blockchain operations,
 * AI model access, and logging.
 */


import {
  type AssegaiConfig,
  type ChainId,
  type Address,
  type TransactionHash,
  type TransactionRequest,
  type RpcMethod,
  type LogLevel,
  type ClaudeOptions,
  type ClaudeResponse,
  type OpenAIOptions,
  type OpenAIResponse,
} from './types.js';

import {
  AssegaiError,
  AuthenticationError,
  NetworkError,
  TimeoutError,
  ValidationError,
  parseErrorResponse,
} from './errors.js';

/**
 * Default configuration values
 */
const DEFAULTS = {
  API_PROXY_URL: 'http://host.docker.internal:8765',
  TIMEOUT: 30000,
  DEBUG: false,
} as const;

/**
 * AssegaiSDK - Main SDK class for Assegai agents
 * 
 * @example
 * ```typescript
 * import { AssegaiSDK } from '@assegailabs/sdk';
 * 
 * const sdk = new AssegaiSDK();
 * 
 * // Get wallet address
 * const address = await sdk.getWalletAddress('eip155:1');
 * 
 * // Query chain
 * const balance = await sdk.getBalance('eip155:1', address);
 * 
 * // Request transaction (requires user approval)
 * const txHash = await sdk.requestTransaction({
 *   chain: 'eip155:1',
 *   to: '0x...',
 *   value: '1000000000000000000', // 1 ETH in wei
 * });
 * ```
 */
export class AssegaiSDK {
  private readonly apiProxyUrl: string;
  private readonly agentId: string;
  private readonly agentToken: string;
  private readonly timeout: number;
  private readonly debugEnabled: boolean;

  /**
   * Create a new AssegaiSDK instance
   * 
   * @param config - Configuration options (optional, uses environment variables by default)
   * @throws {AuthenticationError} If agent ID or token is not provided
   */
  constructor(config: AssegaiConfig = {}) {
    this.apiProxyUrl = config.apiProxyUrl 
      ?? process.env.ASSEGAI_API_PROXY 
      ?? DEFAULTS.API_PROXY_URL;
    
    this.agentId = config.agentId 
      ?? process.env.ASSEGAI_AGENT_ID 
      ?? '';
    
    this.agentToken = config.agentToken 
      ?? process.env.ASSEGAI_AGENT_TOKEN 
      ?? '';
    
    this.timeout = config.timeout ?? DEFAULTS.TIMEOUT;
    this.debugEnabled = config.debug ?? DEFAULTS.DEBUG;

    if (!this.agentId || !this.agentToken) {
      throw new AuthenticationError(
        'Agent ID and token are required. ' +
        'Set ASSEGAI_AGENT_ID and ASSEGAI_AGENT_TOKEN environment variables or pass them in config.'
      );
    }
  }

  // ============================================
  // Internal HTTP Client
  // ============================================

  /**
   * Make an authenticated request to the API proxy
   */
  private async fetch<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.apiProxyUrl}${path}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Assegai-Agent-ID': this.agentId,
      'X-Assegai-Agent-Token': this.agentToken,
      ...(options.headers as Record<string, string> || {}),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      if (this.debugEnabled) {
        console.log(`[AssegaiSDK] ${options.method || 'GET'} ${path}`);
      }

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorBody: { error?: string; message?: string };
        try {
          errorBody = await response.json() as { error?: string; message?: string };
        } catch {
          errorBody = { error: `Request failed with status ${response.status}` };
        }
        parseErrorResponse(response.status, errorBody);
      }

      return await response.json() as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof AssegaiError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new TimeoutError(`Request to ${path} timed out after ${this.timeout}ms`);
        }
        throw new NetworkError(error.message);
      }

      throw new NetworkError('Unknown network error');
    }
  }

  // ============================================
  // Wallet & Chain Operations
  // ============================================

  /**
   * Get the connected wallet address for a chain
   * 
   * @param chain - CAIP-2 chain identifier (e.g., "eip155:1")
   * @returns The wallet address
   * 
   * @example
   * ```typescript
   * const address = await sdk.getWalletAddress('eip155:1');
   * console.log(address); // "0x..."
   * ```
   */
  async getWalletAddress(chain: ChainId): Promise<Address> {
    const response = await this.fetch<{ address: Address }>(
      `/agent/wallet-address/${chain}`,
      { method: 'GET' }
    );
    return response.address;
  }

  /**
   * Query a blockchain using JSON-RPC
   * 
   * @param chain - CAIP-2 chain identifier
   * @param method - JSON-RPC method name
   * @param params - Method parameters
   * @returns The RPC result
   * 
   * @example
   * ```typescript
   * const blockNumber = await sdk.queryChain('eip155:1', 'eth_blockNumber', []);
   * const balance = await sdk.queryChain('eip155:1', 'eth_getBalance', [address, 'latest']);
   * ```
   */
  async queryChain<T = unknown>(
    chain: ChainId,
    method: RpcMethod,
    params: unknown[] = []
  ): Promise<T> {
    const response = await this.fetch<{ result: T }>(
      '/agent/query-chain',
      {
        method: 'POST',
        body: JSON.stringify({ chain, method, params }),
      }
    );
    return response.result;
  }

  /**
   * Get the ETH balance of an address
   * 
   * @param chain - CAIP-2 chain identifier
   * @param address - Ethereum address
   * @returns Balance in wei as hex string
   * 
   * @example
   * ```typescript
   * const balanceHex = await sdk.getBalance('eip155:1', '0x...');
   * const balanceWei = BigInt(balanceHex);
   * ```
   */
  async getBalance(chain: ChainId, address: Address): Promise<string> {
    return this.queryChain<string>(chain, 'eth_getBalance', [address, 'latest']);
  }

  /**
   * Get the transaction count (nonce) for an address
   * 
   * @param chain - CAIP-2 chain identifier
   * @param address - Ethereum address
   * @returns Transaction count as hex string
   */
  async getTransactionCount(chain: ChainId, address: Address): Promise<string> {
    return this.queryChain<string>(chain, 'eth_getTransactionCount', [address, 'latest']);
  }

  /**
   * Get the current gas price
   * 
   * @param chain - CAIP-2 chain identifier
   * @returns Gas price in wei as hex string
   */
  async getGasPrice(chain: ChainId): Promise<string> {
    return this.queryChain<string>(chain, 'eth_gasPrice', []);
  }

  /**
   * Get the current block number
   * 
   * @param chain - CAIP-2 chain identifier
   * @returns Block number as hex string
   */
  async getBlockNumber(chain: ChainId): Promise<string> {
    return this.queryChain<string>(chain, 'eth_blockNumber', []);
  }

  /**
   * Check if an address is a contract
   * 
   * @param chain - CAIP-2 chain identifier
   * @param address - Ethereum address
   * @returns True if the address has code (is a contract)
   */
  async isContract(chain: ChainId, address: Address): Promise<boolean> {
    const code = await this.queryChain<string>(chain, 'eth_getCode', [address, 'latest']);
    return code !== '0x' && code !== '0x0';
  }

  // ============================================
  // Transaction Operations
  // ============================================

  /**
   * Request a transaction (requires user approval in Assegai UI)
   * 
   * This method will block until the user approves or rejects the transaction,
   * or until the approval timeout (5 minutes) is reached.
   * 
   * @param request - Transaction request parameters
   * @returns Transaction hash if approved
   * @throws {TransactionRejectedError} If user rejects the transaction
   * @throws {TransactionTimeoutError} If approval times out
   * @throws {InsufficientAllowanceError} If spending allowance is not configured
   * 
   * @example
   * ```typescript
   * try {
   *   const txHash = await sdk.requestTransaction({
   *     chain: 'eip155:1',
   *     to: '0x...',
   *     value: '1000000000000000000', // 1 ETH
   *   });
   *   console.log('Transaction sent:', txHash);
   * } catch (error) {
   *   if (error instanceof TransactionRejectedError) {
   *     console.log('User rejected the transaction');
   *   }
   * }
   * ```
   */
  async requestTransaction(request: TransactionRequest): Promise<TransactionHash> {
    // Validate request
    if (!request.chain) {
      throw new ValidationError('chain is required');
    }
    if (!request.to || !/^0x[a-fA-F0-9]{40}$/.test(request.to)) {
      throw new ValidationError('Invalid "to" address');
    }
    if (!request.value) {
      throw new ValidationError('value is required');
    }

    const response = await this.fetch<{ success: boolean; txHash: TransactionHash }>(
      '/agent/request-transaction',
      {
        method: 'POST',
        body: JSON.stringify({
          chain: request.chain,
          to: request.to,
          value: request.value,
          data: request.data || '0x',
          gasLimit: request.gasLimit || '21000',
        }),
      }
    );

    return response.txHash;
  }

  // ============================================
  // AI/LLM Operations
  // ============================================

  /**
   * Call Claude API
   * 
   * @param options - Claude API options
   * @returns Claude API response
   * 
   * @example
   * ```typescript
   * const response = await sdk.callClaude({
   *   model: 'claude-sonnet-4-5-20250929',
   *   messages: [
   *     { role: 'user', content: 'Hello, Claude!' }
   *   ],
   *   max_tokens: 1024,
   * });
   * 
   * const text = response.content
   *   .filter(block => block.type === 'text')
   *   .map(block => block.text)
   *   .join('');
   * ```
   */
  async callClaude(options: ClaudeOptions): Promise<ClaudeResponse> {
    return this.fetch<ClaudeResponse>(
      '/api/anthropic/v1/messages',
      {
        method: 'POST',
        body: JSON.stringify({
          model: options.model,
          messages: options.messages,
          max_tokens: options.max_tokens ?? 4096,
          system: options.system,
          tools: options.tools,
          temperature: options.temperature,
          stop_sequences: options.stop_sequences,
        }),
      }
    );
  }

  /**
   * Call OpenAI API
   * 
   * @param options - OpenAI API options
   * @returns OpenAI API response
   * 
   * @example
   * ```typescript
   * const response = await sdk.callOpenAI({
   *   model: 'gpt-4',
   *   messages: [
   *     { role: 'user', content: 'Hello!' }
   *   ],
   * });
   * 
   * const text = response.choices[0].message.content;
   * ```
   */
  async callOpenAI(options: OpenAIOptions): Promise<OpenAIResponse> {
    return this.fetch<OpenAIResponse>(
      '/api/openai/v1/chat/completions',
      {
        method: 'POST',
        body: JSON.stringify({
          model: options.model,
          messages: options.messages,
          max_tokens: options.max_tokens,
          temperature: options.temperature,
          tools: options.tools,
        }),
      }
    );
  }

  // ============================================
  // Logging
  // ============================================

  /**
   * Send a log message to the Assegai UI
   * 
   * @param level - Log level
   * @param message - Log message
   * @param data - Optional structured data
   * 
   * @example
   * ```typescript
   * await sdk.log('info', 'Processing started');
   * await sdk.log('success', 'Transaction complete', { txHash: '0x...' });
   * await sdk.log('error', 'Something went wrong', { error: err.message });
   * ```
   */
  async log(level: LogLevel, message: string, data?: Record<string, unknown>): Promise<void> {
    // Also log to console
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    if (level === 'error') {
      console.error(formatted, data || '');
    } else if (level === 'warn') {
      console.warn(formatted, data || '');
    } else if (this.debugEnabled || level !== 'debug') {
      console.log(formatted, data || '');
    }

    // Send to Assegai UI
    try {
      await this.fetch<{ success: boolean }>(
        '/agent/log',
        {
          method: 'POST',
          body: JSON.stringify({ level, message, data }),
        }
      );
    } catch {
      // Don't throw on log failures - just log to console
      console.error(`[AssegaiSDK] Failed to send log to UI: ${message}`);
    }
  }

  // Convenience logging methods

  /** Log a debug message */
  async debug(message: string, data?: Record<string, unknown>): Promise<void> {
    return this.log('debug', message, data);
  }

  /** Log an info message */
  async info(message: string, data?: Record<string, unknown>): Promise<void> {
    return this.log('info', message, data);
  }

  /** Log a warning message */
  async warn(message: string, data?: Record<string, unknown>): Promise<void> {
    return this.log('warn', message, data);
  }

  /** Log an error message */
  async error(message: string, data?: Record<string, unknown>): Promise<void> {
    return this.log('error', message, data);
  }

  /** Log a success message */
  async success(message: string, data?: Record<string, unknown>): Promise<void> {
    return this.log('success', message, data);
  }

  // ============================================
  // Utilities
  // ============================================

  /**
   * Get the agent ID
   */
  getAgentId(): string {
    return this.agentId;
  }

  /**
   * Check if the SDK is properly configured
   */
  isConfigured(): boolean {
    return Boolean(this.agentId && this.agentToken);
  }

  /**
   * Health check - verify connection to API proxy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiProxyUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}