/**
 * @assegailabs/sdk - Type Definitions
 */

// ============================================
// Configuration Types
// ============================================

/**
 * SDK configuration options
 */
export interface AssegaiConfig {
  /** API proxy URL (default: from ASSEGAI_API_PROXY env var or http://host.docker.internal:8765) */
  apiProxyUrl?: string;
  /** Agent ID (default: from ASSEGAI_AGENT_ID env var) */
  agentId?: string;
  /** Agent authentication token (default: from ASSEGAI_AGENT_TOKEN env var) */
  agentToken?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Enable debug logging (default: false) */
  debug?: boolean;
}

// ============================================
// Chain Types
// ============================================

/**
 * CAIP-2 chain identifier (e.g., "eip155:1" for Ethereum mainnet)
 */
export type ChainId = string;

/**
 * Ethereum address (0x-prefixed, 40 hex characters)
 */
export type Address = `0x${string}`;

/**
 * Transaction hash (0x-prefixed, 64 hex characters)
 */
export type TransactionHash = `0x${string}`;

/**
 * Hex-encoded data (0x-prefixed)
 */
export type HexData = `0x${string}`;

// ============================================
// Transaction Types
// ============================================

/**
 * Parameters for requesting a transaction
 */
export interface TransactionRequest {
  /** CAIP-2 chain identifier */
  chain: ChainId;
  /** Recipient address */
  to: Address;
  /** Value in wei (as string to handle large numbers) */
  value: string;
  /** Transaction data (default: "0x") */
  data?: HexData;
  /** Gas limit (default: "21000" for simple transfers) */
  gasLimit?: string;
}

/**
 * Result of a successful transaction
 */
export interface TransactionResult {
  /** Whether the transaction was successful */
  success: boolean;
  /** Transaction hash if successful */
  txHash?: TransactionHash;
  /** Error message if failed */
  error?: string;
}

// ============================================
// RPC Types
// ============================================

/**
 * JSON-RPC method names commonly used
 */
export type RpcMethod = 
  | 'eth_getBalance'
  | 'eth_getTransactionCount'
  | 'eth_getCode'
  | 'eth_call'
  | 'eth_estimateGas'
  | 'eth_gasPrice'
  | 'eth_blockNumber'
  | 'eth_getBlockByNumber'
  | 'eth_getBlockByHash'
  | 'eth_getTransactionByHash'
  | 'eth_getTransactionReceipt'
  | 'eth_getLogs'
  | 'eth_chainId'
  | string; // Allow custom methods

/**
 * Parameters for a chain query
 */
export interface ChainQueryParams {
  /** CAIP-2 chain identifier */
  chain: ChainId;
  /** JSON-RPC method name */
  method: RpcMethod;
  /** Method parameters */
  params: unknown[];
}

// ============================================
// AI/LLM Types
// ============================================

/**
 * Claude model identifiers
 */
export type ClaudeModel = 
  | 'claude-sonnet-4-5-20250929'
  | 'claude-3-5-sonnet-20241022'
  | 'claude-3-5-haiku-20241022'
  | 'claude-3-opus-20240229'
  | 'claude-3-sonnet-20240229'
  | 'claude-3-haiku-20240307'
  | string; // Allow future models

/**
 * OpenAI model identifiers
 */
export type OpenAIModel =
  | 'gpt-4'
  | 'gpt-4-turbo'
  | 'gpt-4-turbo-preview'
  | 'gpt-3.5-turbo'
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | string; // Allow future models

/**
 * Message role in a conversation
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Text content block
 */
export interface TextContent {
  type: 'text';
  text: string;
}

/**
 * Image content block
 */
export interface ImageContent {
  type: 'image';
  source: {
    type: 'base64';
    media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    data: string;
  };
}

/**
 * Tool use content block (from Claude)
 */
export interface ToolUseContent {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/**
 * Tool result content block (to Claude)
 */
export interface ToolResultContent {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

/**
 * Content block types
 */
export type ContentBlock = TextContent | ImageContent | ToolUseContent | ToolResultContent;

/**
 * Message in a conversation
 */
export interface Message {
  role: MessageRole;
  content: string | ContentBlock[];
}

/**
 * Tool definition for Claude
 */
export interface Tool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Options for Claude API calls
 */
export interface ClaudeOptions {
  /** Model to use */
  model: ClaudeModel;
  /** Messages in the conversation */
  messages: Message[];
  /** Maximum tokens to generate */
  max_tokens?: number;
  /** System prompt */
  system?: string;
  /** Tools available to the model */
  tools?: Tool[];
  /** Temperature (0-1) */
  temperature?: number;
  /** Stop sequences */
  stop_sequences?: string[];
}

/**
 * Claude API response
 */
export interface ClaudeResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: ContentBlock[];
  model: string;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' | null;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Options for OpenAI API calls
 */
export interface OpenAIOptions {
  /** Model to use */
  model: OpenAIModel;
  /** Messages in the conversation */
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  /** Maximum tokens to generate */
  max_tokens?: number;
  /** Temperature (0-2) */
  temperature?: number;
  /** Tools/functions available */
  tools?: Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }>;
}

/**
 * OpenAI API response
 */
export interface OpenAIResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: 'function';
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ============================================
// Logging Types
// ============================================

/**
 * Log levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';

/**
 * Log entry
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  data?: Record<string, unknown>;
}

// ============================================
// Error Types
// ============================================

/**
 * Error codes returned by the API
 */
export enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMITED = 'RATE_LIMITED',
  TIMEOUT = 'TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TRANSACTION_REJECTED = 'TRANSACTION_REJECTED',
  TRANSACTION_TIMEOUT = 'TRANSACTION_TIMEOUT',
  INSUFFICIENT_ALLOWANCE = 'INSUFFICIENT_ALLOWANCE',
  RPC_ERROR = 'RPC_ERROR',
  API_ERROR = 'API_ERROR',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Structured error from the SDK
 */
export interface AssegaiErrorInfo {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}
