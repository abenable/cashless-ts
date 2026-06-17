import { describe, expect, it, vi } from 'vitest';
import { AirtelClient } from '../../src/airtel/client.js';
import { DisbursementsResource } from '../../src/airtel/resources/disbursements.js';

describe('DisbursementsResource', () => {
  const baseUrl = 'https://openapiuat.airtel.ug';

  function createResource(
    fetchFn: typeof fetch
  ): { resource: DisbursementsResource; client: AirtelClient } {
    const client = new AirtelClient({
      clientId: 'id',
      clientSecret: 'secret',
      baseUrl,
      country: 'UG',
      currency: 'UGX',
      fetchFn,
    });
    return { resource: client.disbursements, client };
  }

  function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  it('disburses funds', async () => {
    let capturedInit: RequestInit | undefined;
    const fetchFn = vi.fn(async (url, init?) => {
      if (url.toString() === `${baseUrl}/auth/oauth2/token`) {
        return jsonResponse({ access_token: 'token', expires_in: '180', token_type: 'bearer' });
      }
      expect(url.toString()).toBe(`${baseUrl}/standard/v2/disbursements/`);
      capturedInit = init;
      return jsonResponse({
        data: {
          transaction: {
            airtel_money_id: 'am-1',
            id: 'tx-1',
            reference_id: 'ref-1',
            status: 'TS',
          },
        },
        status: { code: '200', message: 'Success', success: true },
      });
    }) as unknown as typeof fetch;

    const { resource } = createResource(fetchFn);
    const result = await resource.disburse({
      payee: { currency: 'UGX', msisdn: '75****26', name: 'Bob' },
      reference: 'AB***141',
      pin: 'KYJ*****Rsa44',
      transaction: { amount: 1000, id: 'AB***141', type: 'B2B' },
    });

    expect(result.data.transaction.status).toBe('TS');
    expect(result.status.success).toBe(true);
    expect(JSON.parse(capturedInit?.body as string)).toEqual({
      payee: { currency: 'UGX', msisdn: '75****26', name: 'Bob' },
      reference: 'AB***141',
      pin: 'KYJ*****Rsa44',
      transaction: { amount: 1000, id: 'AB***141', type: 'B2B' },
    });
  });

  it('enquires about a disbursement', async () => {
    const fetchFn = vi.fn(async (url) => {
      if (url.toString() === `${baseUrl}/auth/oauth2/token`) {
        return jsonResponse({ access_token: 'token', expires_in: '180', token_type: 'bearer' });
      }
      expect(url.toString()).toBe(`${baseUrl}/standard/v2/disbursements/tx-1?transactionType=B2B`);
      return jsonResponse({
        data: {
          transaction: {
            id: 'tx-1',
            message: 'Successfully credited.',
            status: 'TS',
          },
        },
        status: { code: '200', message: 'Success', success: false },
      });
    }) as unknown as typeof fetch;

    const { resource } = createResource(fetchFn);
    const result = await resource.getStatus('tx-1', 'B2B');

    expect(result.data.transaction.status).toBe('TS');
    expect(result.data.transaction.message).toBe('Successfully credited.');
  });
});
