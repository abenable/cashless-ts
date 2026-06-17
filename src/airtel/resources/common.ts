import type { AirtelClient } from '../client.js';
import type { BalanceResponse } from '../types.js';

export class CommonResource {
  constructor(private readonly client: AirtelClient) {}

  getBalance(walletType: string): Promise<BalanceResponse> {
    return this.client.request<BalanceResponse>(
      'GET',
      `/standard/v2/users/balance/${encodeURIComponent(walletType)}`
    );
  }
}
