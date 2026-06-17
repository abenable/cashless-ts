import type { MomoClient } from '../client.js';
import type { Refund, RefundResult, Transfer, TransferResult } from '../types.js';

export class DisbursementsResource {
  constructor(private readonly client: MomoClient) {}

  async transfer(referenceId: string, params: Transfer): Promise<void> {
    return this.client.request<void>('POST', '/v1_0/transfer', params, {
      'X-Reference-Id': referenceId,
    });
  }

  getTransferStatus(referenceId: string): Promise<TransferResult> {
    return this.client.request<TransferResult>('GET', `/v1_0/transfer/${referenceId}`);
  }

  async refund(referenceId: string, params: Refund): Promise<void> {
    return this.client.request<void>('POST', '/v1_0/refund', params, {
      'X-Reference-Id': referenceId,
    });
  }

  getRefundStatus(referenceId: string): Promise<RefundResult> {
    return this.client.request<RefundResult>('GET', `/v1_0/refund/${referenceId}`);
  }
}
