import { describe, expect, it, vi } from 'vitest';
import { AirtelClient, AIRTEL_SANDBOX_BASE_URL } from '../../src/airtel/client.js';
import { AirtelError } from '../../src/airtel/errors.js';

describe('AirtelClient', () => {
  const baseUrl = 'https://openapiuat.airtel.ug';

  function createClient(fetchFn: typeof fetch) {
    return new AirtelClient({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      baseUrl,
      country: 'UG',
      currency: 'UGX',
      fetchFn,
    });
  }

  function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  it('constructs with airtel credentials', () => {
    const client = createClient(vi.fn() as unknown as typeof fetch);
    expect(client.disbursements).toBeDefined();
    expect(client.collections).toBeDefined();
  });

  it('resolves the Uganda sandbox base url from environment', async () => {
    const fetchFn = vi.fn(async (url: string | URL | Request) => {
      if (url.toString() === `${AIRTEL_SANDBOX_BASE_URL}/auth/oauth2/token`) {
        return jsonResponse({ access_token: 'tkn-123', expires_in: '180', token_type: 'bearer' });
      }
      return jsonResponse({});
    }) as unknown as typeof fetch;

    const client = new AirtelClient({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      environment: 'sandbox',
      country: 'UG',
      currency: 'UGX',
      fetchFn,
    });

    const token = await client.createAccessToken();
    expect(token.accessToken).toBe('tkn-123');
  });

  it('fetches and caches an access token', async () => {
    const fetchFn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const u = url.toString();
      if (u === `${baseUrl}/auth/oauth2/token`) {
        expect(init?.method).toBe('POST');
        const body = JSON.parse(init?.body as string);
        expect(body).toEqual({
          client_id: 'test-client-id',
          client_secret: 'test-client-secret',
          grant_type: 'client_credentials',
        });
        expect(init?.headers).toMatchObject({
          Accept: '*/*',
          'Content-Type': 'application/json',
        });
        return jsonResponse({ access_token: 'tkn-123', expires_in: '180', token_type: 'bearer' });
      }
      return jsonResponse({});
    }) as unknown as typeof fetch;

    const client = createClient(fetchFn);
    const token = await client.createAccessToken();

    expect(token).toEqual({ accessToken: 'tkn-123', tokenType: 'bearer', expiresIn: 180 });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('reuses a cached token until the refresh buffer is reached', async () => {
    const fetchFn = vi.fn(async (url: string | URL | Request) => {
      if (url.toString() === `${baseUrl}/auth/oauth2/token`) {
        return jsonResponse({ access_token: 'tkn-abc', expires_in: '180', token_type: 'bearer' });
      }
      return jsonResponse({ data: { transaction: {} } });
    }) as unknown as typeof fetch;

    const client = createClient(fetchFn);
    await client.request('GET', '/standard/v2/disbursements/123');
    await client.request('GET', '/standard/v2/disbursements/456');

    // Once for token, twice for requests
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(fetchFn.mock.calls[1][0]).toBe(`${baseUrl}/standard/v2/disbursements/123`);
    expect(fetchFn.mock.calls[2][0]).toBe(`${baseUrl}/standard/v2/disbursements/456`);
  });

  it('sends required Airtel headers on authenticated requests', async () => {
    let capturedInit: RequestInit | undefined;
    const fetchFn = vi.fn(async (url, init?) => {
      if (url.toString() === `${baseUrl}/auth/oauth2/token`) {
        return jsonResponse({ access_token: 'tkn-xyz', expires_in: '180', token_type: 'bearer' });
      }
      capturedInit = init;
      return jsonResponse({ status: { success: true } });
    }) as unknown as typeof fetch;

    const client = createClient(fetchFn);
    await client.request('POST', '/standard/v2/disbursements/', { payee: {} });

    expect(capturedInit?.headers).toMatchObject({
      Authorization: 'Bearer tkn-xyz',
      Accept: '*/*',
      'X-Country': 'UG',
      'X-Currency': 'UGX',
      'Content-Type': 'application/json',
    });
  });

  it('refreshes an expired token', async () => {
    let tokenCount = 0;
    const fetchFn = vi.fn(async (url: string | URL | Request) => {
      if (url.toString() === `${baseUrl}/auth/oauth2/token`) {
        tokenCount += 1;
        return jsonResponse({
          access_token: `tkn-${tokenCount}`,
          expires_in: '0',
          token_type: 'bearer',
        });
      }
      return jsonResponse({});
    }) as unknown as typeof fetch;

    const client = createClient(fetchFn);
    await client.request('GET', '/standard/v1/payments/1');
    await client.request('GET', '/standard/v1/payments/2');

    expect(tokenCount).toBe(2);
  });

  it('throws AirtelError for non-2xx responses', async () => {
    const fetchFn = vi.fn(async () => {
      return jsonResponse({ code: 'DP00900001005', message: 'Failed' }, 400);
    }) as unknown as typeof fetch;

    const client = createClient(fetchFn);
    await expect(client.createAccessToken()).rejects.toBeInstanceOf(AirtelError);
    await expect(client.createAccessToken()).rejects.toMatchObject({
      type: 'airtel_error',
      code: 'DP00900001005',
      message: 'Failed',
    });
  });

  it('falls back to HTTP status when error body is missing', async () => {
    const fetchFn = vi.fn(async () => {
      return new Response('not json', { status: 500, statusText: 'Internal Server Error' });
    }) as unknown as typeof fetch;

    const client = createClient(fetchFn);
    await expect(client.request('GET', '/standard/v2/disbursements/1')).rejects.toMatchObject({
      type: 'airtel_error',
      code: 'http_500',
    });
  });
});
