/**
 * @assegailabs/sdk - Error Classes
 */

import { ErrorCode, type AssegaiErrorInfo } from './types.js';

/**
 * Base error class for all Assegai SDK errors
 */
export class AssegaiError extends Error {
  readonly code: ErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AssegaiError';
    this.code = code;
    if (details !== undefined) {
      this.details = details;
    }
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (typeof (Error as any).captureStackTrace === 'function') {
      (Error as any).captureStackTrace(this, AssegaiError);
    }
  }

  toJSON(): AssegaiErrorInfo {
    const result: AssegaiErrorInfo = {
      code: this.code,
      message: this.message,
    };
    if (this.details !== undefined) {
      result.details = this.details;
    }
    return result;
  }
}

/**
 * Error thrown when authentication fails
 */
export class AuthenticationError extends AssegaiError {
  constructor(message: string = 'Authentication failed', details?: Record<string, unknown>) {
    super(ErrorCode.UNAUTHORIZED, message, details);
    this.name = 'AuthenticationError';
  }
}

/**
 * Error thrown when access is forbidden
 */
export class ForbiddenError extends AssegaiError {
  constructor(message: string = 'Access forbidden', details?: Record<string, unknown>) {
    super(ErrorCode.FORBIDDEN, message, details);
    this.name = 'ForbiddenError';
  }
}

/**
 * Error thrown when rate limited
 */
export class RateLimitError extends AssegaiError {
  readonly retryAfter?: number;

  constructor(message: string = 'Rate limit exceeded', retryAfter?: number, details?: Record<string, unknown>) {
    super(ErrorCode.RATE_LIMITED, message, details);
    this.name = 'RateLimitError';
    if (retryAfter !== undefined) {
      this.retryAfter = retryAfter;
    }
  }
}

/**
 * Error thrown when a request times out
 */
export class TimeoutError extends AssegaiError {
  constructor(message: string = 'Request timed out', details?: Record<string, unknown>) {
    super(ErrorCode.TIMEOUT, message, details);
    this.name = 'TimeoutError';
  }
}

/**
 * Error thrown when a network error occurs
 */
export class NetworkError extends AssegaiError {
  constructor(message: string = 'Network error', details?: Record<string, unknown>) {
    super(ErrorCode.NETWORK_ERROR, message, details);
    this.name = 'NetworkError';
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends AssegaiError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCode.VALIDATION_ERROR, message, details);
    this.name = 'ValidationError';
  }
}

/**
 * Error thrown when a transaction is rejected
 */
export class TransactionRejectedError extends AssegaiError {
  constructor(message: string = 'Transaction rejected by user', details?: Record<string, unknown>) {
    super(ErrorCode.TRANSACTION_REJECTED, message, details);
    this.name = 'TransactionRejectedError';
  }
}

/**
 * Error thrown when a transaction times out waiting for approval
 */
export class TransactionTimeoutError extends AssegaiError {
  constructor(message: string = 'Transaction approval timed out', details?: Record<string, unknown>) {
    super(ErrorCode.TRANSACTION_TIMEOUT, message, details);
    this.name = 'TransactionTimeoutError';
  }
}

/**
 * Error thrown when spending allowance is insufficient
 */
export class InsufficientAllowanceError extends AssegaiError {
  constructor(message: string = 'Insufficient spending allowance', details?: Record<string, unknown>) {
    super(ErrorCode.INSUFFICIENT_ALLOWANCE, message, details);
    this.name = 'InsufficientAllowanceError';
  }
}

/**
 * Error thrown when an RPC call fails
 */
export class RpcError extends AssegaiError {
  readonly rpcCode?: number;

  constructor(message: string, rpcCode?: number, details?: Record<string, unknown>) {
    super(ErrorCode.RPC_ERROR, message, details);
    this.name = 'RpcError';
    if (rpcCode !== undefined) {
      this.rpcCode = rpcCode;
    }
  }
}

/**
 * Error thrown when an AI API call fails
 */
export class ApiError extends AssegaiError {
  readonly statusCode?: number;

  constructor(message: string, statusCode?: number, details?: Record<string, unknown>) {
    super(ErrorCode.API_ERROR, message, details);
    this.name = 'ApiError';
    if (statusCode !== undefined) {
      this.statusCode = statusCode;
    }
  }
}

/**
 * Parse an error response and throw the appropriate error type
 */
export function parseErrorResponse(status: number, body: { error?: string; message?: string }): never {
  const message = body.error || body.message || 'Unknown error';

  // Check for specific error patterns
  if (message.includes('No spending allowances') || message.includes('allowance')) {
    throw new InsufficientAllowanceError(message);
  }
  
  if (message.includes('rejected by user')) {
    throw new TransactionRejectedError(message);
  }
  
  if (message.includes('approval timeout')) {
    throw new TransactionTimeoutError(message);
  }
  
  if (message.includes('Rate limit')) {
    throw new RateLimitError(message);
  }
  
  if (message.includes('RPC Error')) {
    throw new RpcError(message);
  }

  // Status code based errors
  switch (status) {
    case 401:
      throw new AuthenticationError(message);
    case 403:
      throw new ForbiddenError(message);
    case 404:
      throw new AssegaiError(ErrorCode.NOT_FOUND, message);
    case 429:
      throw new RateLimitError(message);
    case 408:
      throw new TimeoutError(message);
    default:
      throw new ApiError(message, status);
  }
}