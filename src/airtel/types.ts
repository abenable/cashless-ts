export interface DisbursementPayee {
  currency: string;
  msisdn: string;
  name?: string;
}

export interface DisbursementTransaction {
  amount: number;
  id: string;
  type: string;
}

export interface DisbursementRequest {
  payee: DisbursementPayee;
  reference: string;
  pin: string;
  transaction: DisbursementTransaction;
}

export interface DisbursementTransactionResult {
  airtel_money_id: string;
  id: string;
  reference_id?: string;
  status: string;
}

export interface DisbursementStatusResult {
  airtel_money_id?: string;
  id: string;
  message?: string;
  status: string;
}

export interface AirtelStatus {
  code: string;
  message: string;
  response_code?: string;
  result_code?: string;
  success: boolean;
}

export interface DisbursementResponse {
  data: {
    transaction: DisbursementTransactionResult;
  };
  status: AirtelStatus;
}

export interface DisbursementStatusResponse {
  data: {
    transaction: DisbursementStatusResult;
  };
  status: AirtelStatus;
}

// Collections

export interface Subscriber {
  country: string;
  currency?: string;
  msisdn: string;
}

export interface UssdPushTransaction {
  amount: number;
  country?: string;
  currency?: string;
  id: string;
}

export interface UssdPushRequest {
  reference: string;
  subscriber: Subscriber;
  transaction: UssdPushTransaction;
}

export interface UssdPushTransactionResult {
  id: string | boolean;
  status: string;
}

export interface UssdPushResponse {
  data: {
    transaction: UssdPushTransactionResult;
  };
  status: AirtelStatus;
}

export interface PaymentStatusResult {
  airtel_money_id?: string;
  id: string;
  message?: string;
  status: string;
}

export interface PaymentStatusResponse {
  data: {
    transaction: PaymentStatusResult;
  };
  status: AirtelStatus;
}

export interface RefundTransaction {
  airtel_money_id: string;
}

export interface RefundRequest {
  transaction: RefundTransaction;
}

export interface RefundTransactionResult {
  airtel_money_id: string;
  status: string;
}

export interface RefundResponse {
  data: {
    transaction: RefundTransactionResult;
  };
  status: AirtelStatus;
}

// Account / Common

export interface Balance {
  balance: string;
  currency: string;
  account_status: string;
}

export interface BalanceResponse {
  data: Balance;
  status: AirtelStatus;
}
