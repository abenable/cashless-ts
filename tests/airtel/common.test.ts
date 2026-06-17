import { describe, expect, it, vi } from 'vitest';
import { AirtelClient } from '../../src/airtel/client.js';
import { CommonResource } from '../../src/airtel/resources/common.js';

describe('CommonResource', () => {
  const baseUrl = 'https://openapiuat.airtel.ug';

  function createResource(fetchFn: typeof fetch): CommonResource {
    const client = new AirtelClient({
      clientId: 'id',
      clientSecret: 'secret',
      baseUrl,
      country: 'UG',
      currency: 'UGX',
      fetchFn,
    });
    return client.common;
  }

  function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  it('checks wallet balance by type', async () => {
    const fetchFn = vi.fn(async (url) => {
      if (url.toString() === `${baseUrl}/auth/oauth2/token`) {
        return jsonResponse({ access_token: 'token', expires_in: '180', token_type: 'bearer' });
      }
      expect(url.toString()).toBe(`${baseUrl}/standard/v2/users/balance/DISB`);
      return jsonResponse({
        data: { balance: '37,600.00', currency: 'UGX', account_status: 'Active' },
        status: { code: '200', message: 'SUCCESS', success: false },
      });
    }) as unknown as typeof fetch;

    const resource = createResource(fetchFn);
    const result = await resource.getBalance('DISB');

    expect(result.data.balance).toBe('37,600.00');
    expect(result.data.currency).toBe('UGX');
    expect(result.data.account_status).toBe('Active');
  });
});
