import type { MomoClient } from '../client.js';
import type { AccountHolderActive, Balance } from '../types.js';

export class CommonResource {
  constructor(private readonly client: MomoClient) {}

  getBalance(): Promise<Balance> {
    return this.client.request<Balance>('GET', '/v1_0/account/balance');
  }

  validateAccountHolder(accountHolderIdType: string, accountHolderId: string): Promise<AccountHolderActive> {
    return this.client.request<AccountHolderActive>(
      'GET',
      `/v1_0/accountholder/${accountHolderIdType}/${accountHolderId}/active`
    );
  }
}
