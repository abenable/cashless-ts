import type { MomoClient } from '../client.js';
import type { RequestToPay, RequestToPayResult } from '../types.js';

export class CollectionsResource {
  constructor(private readonly client: MomoClient) {}

  async requestToPay(referenceId: string, params: RequestToPay): Promise<void> {
    return this.client.request<void>('POST', '/v1_0/requesttopay', params, {
      'X-Reference-Id': referenceId,
    });
  }

  getRequestToPayStatus(referenceId: string): Promise<RequestToPayResult> {
    return this.client.request<RequestToPayResult>('GET', `/v1_0/requesttopay/${referenceId}`);
  }
}
