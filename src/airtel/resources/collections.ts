import type { AirtelClient } from '../client.js';
import type {
  PaymentStatusResponse,
  RefundRequest,
  RefundResponse,
  UssdPushRequest,
  UssdPushResponse,
} from '../types.js';

export class CollectionsResource {
  constructor(private readonly client: AirtelClient) {}

  ussdPush(request: UssdPushRequest): Promise<UssdPushResponse> {
    return this.client.request<UssdPushResponse>('POST', '/merchant/v2/payments/', request);
  }

  getPaymentStatus(id: string): Promise<PaymentStatusResponse> {
    return this.client.request<PaymentStatusResponse>(
      'GET',
      `/standard/v1/payments/${encodeURIComponent(id)}`
    );
  }

  refund(request: RefundRequest): Promise<RefundResponse> {
    return this.client.request<RefundResponse>('POST', '/standard/v2/payments/refund', request);
  }
}
