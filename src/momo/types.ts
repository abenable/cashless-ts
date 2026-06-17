export type PartyIdType = 'MSISDN' | 'EMAIL' | 'PARTY_CODE';

export interface Party {
  partyIdType: PartyIdType;
  partyId: string;
}

export interface Balance {
  availableBalance: string;
  currency: string;
}

export interface AccountHolderActive {
  result: boolean;
}

export interface ErrorReason {
  code: string;
  message: string;
}

export interface RequestToPay {
  amount: string;
  currency: string;
  externalId: string;
  payer: Party;
  payerMessage?: string;
  payeeNote?: string;
}

export type RequestToPayStatus = 'PENDING' | 'SUCCESSFUL' | 'FAILED';

export interface RequestToPayResult {
  amount: string;
  currency: string;
  financialTransactionId?: string;
  externalId: string;
  payer: Party;
  payerMessage?: string;
  payeeNote?: string;
  status: RequestToPayStatus;
  reason?: ErrorReason;
}

export interface Transfer {
  amount: string;
  currency: string;
  externalId: string;
  payee: Party;
  payerMessage?: string;
  payeeNote?: string;
}

export type TransferStatus = 'PENDING' | 'SUCCESSFUL' | 'FAILED';

export interface TransferResult {
  amount: string;
  currency: string;
  financialTransactionId?: string;
  externalId: string;
  payee: Party;
  payerMessage?: string;
  payeeNote?: string;
  status: TransferStatus;
  reason?: ErrorReason;
}

export interface Refund {
  amount: string;
  currency: string;
  externalId: string;
  referenceIdToRefund: string;
  payerMessage?: string;
  payeeNote?: string;
}

export type RefundStatus = 'PENDING' | 'SUCCESSFUL' | 'FAILED';

export interface RefundResult {
  amount: string;
  currency: string;
  financialTransactionId?: string;
  externalId: string;
  referenceIdToRefund: string;
  payerMessage?: string;
  payeeNote?: string;
  status: RefundStatus;
  reason?: ErrorReason;
}
