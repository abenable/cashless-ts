import { describe, expect, it, vi } from 'vitest';
import { AirtelClient } from '../../src/airtel/client.js';
import { CollectionsResource } from '../../src/airtel/resources/collections.js';

describe('CollectionsResource', () => {
  const baseUrl = 'https://openapiuat.airtel.ug';

  function createResource(fetchFn: typeof fetch): CollectionsResource {
    const client = new AirtelClient({
      clientId: 'id',
      clientSecret: 'secret',
      baseUrl,
      country: 'UG',
      currency: 'UGX',
      fetchFn,
    });
    return client.collections;
  }

  function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  it('requests a USSD push payment', async () => {
    const fetchFn = vi.fn(async (url, init?) => {
      if (url.toString() === `${baseUrl}/auth/oauth2/token`) {
        return jsonResponse({ access_token: 'token', expires_in: '180', token_type: 'bearer' });
      }
      expect(url.toString()).toBe(`${baseUrl}/merchant/v2/payments/`);
      expect(init?.method).toBe('POST');
      return jsonResponse({
        data: { transaction: { id: 'random-unique-id', status: 'SUCCESS' } },
        status: { code: '200', message: 'SUCCESS', success: true },
      });
    }) as unknown as typeof fetch;

    const resource = createResource(fetchFn);
    const result = await resource.ussdPush({
      reference: 'Testing transaction',
      subscriber: { country: 'UG', currency: 'UGX', msisdn: '12****89' },
      transaction: { amount: 1000, country: 'UG', currency: 'UGX', id: 'random-unique-id' },
    });

    expect(result.data.transaction.status).toBe('SUCCESS');
  });

  it('enquires about a payment', async () => {
    const fetchFn = vi.fn(async (url) => {
      if (url.toString() === `${baseUrl}/auth/oauth2/token`) {
        return jsonResponse({ access_token: 'token', expires_in: '180', token_type: 'bearer' });
      }
      expect(url.toString()).toBe(`${baseUrl}/standard/v1/payments/83****88`);
      return jsonResponse({
        data: {
          transaction: {
            airtel_money_id: 'C36*******67',
            id: '83****88',
            message: 'success',
            status: 'TS',
          },
        },
        status: { code: '200', message: 'SUCCESS', success: false },
      });
    }) as unknown as typeof fetch;

    const resource = createResource(fetchFn);
    const result = await resource.getPaymentStatus('83****88');

    expect(result.data.transaction.status).toBe('TS');
    expect(result.data.transaction.airtel_money_id).toBe('C36*******67');
  });

  it('refunds a payment', async () => {
    const fetchFn = vi.fn(async (url, init?) => {
      if (url.toString() === `${baseUrl}/auth/oauth2/token`) {
        return jsonResponse({ access_token: 'token', expires_in: '180', token_type: 'bearer' });
      }
      expect(url.toString()).toBe(`${baseUrl}/standard/v2/payments/refund`);
      expect(JSON.parse(init?.body as string)).toEqual({
        transaction: { airtel_money_id: 'CI************18' },
      });
      return jsonResponse({
        data: { transaction: { airtel_money_id: 'CI2****29', status: 'SUCCESS' } },
        status: { code: '200', message: 'SUCCESS', success: false },
      });
    }) as unknown as typeof fetch;

    const resource = createResource(fetchFn);
    const result = await resource.refund({ transaction: { airtel_money_id: 'CI************18' } });

    expect(result.data.transaction.status).toBe('SUCCESS');
  });
});
