import type { AirtelClient } from '../client.js';
import type {
  DisbursementRequest,
  DisbursementResponse,
  DisbursementStatusResponse,
} from '../types.js';

export class DisbursementsResource {
  constructor(private readonly client: AirtelClient) {}

  disburse(request: DisbursementRequest): Promise<DisbursementResponse> {
    return this.client.request<DisbursementResponse>('POST', '/standard/v2/disbursements/', request);
  }

  getStatus(id: string, transactionType: string): Promise<DisbursementStatusResponse> {
    const query = new URLSearchParams({ transactionType });
    return this.client.request<DisbursementStatusResponse>(
      'GET',
      `/standard/v2/disbursements/${encodeURIComponent(id)}?${query.toString()}`
    );
  }
}
