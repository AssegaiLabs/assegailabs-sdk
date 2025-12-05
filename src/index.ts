/**
 * @assegailabs/sdk
 * 
 * SDK for building agents in the Assegai Agent Sandbox.
 * Provides typed access to blockchain operations, AI models, and logging.
 * 
 * @packageDocumentation
 */

// Main client
export { AssegaiSDK } from './client.js';

// Types
export type {
  // Config
  AssegaiConfig,
  
  // Chain types
  ChainId,
  Address,
  TransactionHash,
  HexData,
  
  // Transaction types
  TransactionRequest,
  TransactionResult,
  
  // RPC types
  RpcMethod,
  ChainQueryParams,
  
  // AI types
  ClaudeModel,
  OpenAIModel,
  MessageRole,
  TextContent,
  ImageContent,
  ToolUseContent,
  ToolResultContent,
  ContentBlock,
  Message,
  Tool,
  ClaudeOptions,
  ClaudeResponse,
  OpenAIOptions,
  OpenAIResponse,
  
  // Logging types
  LogLevel,
  LogEntry,
  
  // Error types
  AssegaiErrorInfo,
} from './types.js';

export { ErrorCode } from './types.js';

// Errors
export {
  AssegaiError,
  AuthenticationError,
  ForbiddenError,
  RateLimitError,
  TimeoutError,
  NetworkError,
  ValidationError,
  TransactionRejectedError,
  TransactionTimeoutError,
  InsufficientAllowanceError,
  RpcError,
  ApiError,
} from './errors.js';

// Default export for convenience
export { AssegaiSDK as default } from './client.js';
