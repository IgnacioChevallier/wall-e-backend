export interface BankTransferRequest {
  amount: number;
  alias: string;
  source: string;
}

export interface BankTransferResponse {
  success: boolean;
  error?: string;
  transactionId?: string;
}

export interface DebinRequest {
  amount: number;
  toWalletId: string;
}

export interface DebinResponse {
  approved: boolean;
  debinId?: string;
  error?: string;
}

// These are the endpoints that the external bank service must implement
export const BANK_API_ENDPOINTS = {
  transfer: '/api/bank/transfer',
  debin: '/api/bank/debin-request',
} as const;
