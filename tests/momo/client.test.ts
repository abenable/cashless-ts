import { describe, it, expect, vi } from 'vitest';
import { MomoClient, MOMO_SANDBOX_BASE_URL } from '../../src/momo/client.js';
import { MomoError } from '../../src/momo/errors.js';

describe('MomoClient', () => {
  const baseUrl = 'https://sandbox.momodeveloper.mtn.com';
  const apiUser = 'test-api-user';
  const apiKey = 'test-api-key';
  const subscriptionKey = 'test-subscription-key';
  const targetEnvironment = 'sandbox';

  function createClient(fetchFn: typeof fetch) {
    return new MomoClient({
      apiUser,
      apiKey,
      subscriptionKey,
      baseUrl,
      targetEnvironment,
      fetchFn,
    });
  }

  it('constructs with momo credentials', () => {
    const client = createClient(vi.fn<typeof fetch>());
    expect(client).toBeDefined();
  });

  it('resolves the sandbox base url from environment', async () => {
    const fetchFn = vi.fn<typeof fetch>();
    fetchFn.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ access_token: 'token-123', token_type: 'Bearer', expires_in: 3600 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const client = new MomoClient({
      apiUser,
      apiKey,
      subscriptionKey,
      environment: 'sandbox',
      fetchFn,
    });

    await client.createAccessToken();
    const [url] = fetchFn.mock.calls[0];
    expect(url).toBe(`${MOMO_SANDBOX_BASE_URL}/token/`);
  });

  it('creates an access token using basic auth and subscription key', async () => {
    const fetchFn = vi.fn<typeof fetch>();
    fetchFn.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: 'token-123',
          token_type: 'Bearer',
          expires_in: 3600,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const client = createClient(fetchFn);
    const token = await client.createAccessToken();

    expect(token).toEqual({
      accessToken: 'token-123',
      tokenType: 'Bearer',
      expiresIn: 3600,
    });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe(`${baseUrl}/token/`);
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({
      Authorization: `Basic ${btoa(`${apiUser}:${apiKey}`)}`,
      'Ocp-Apim-Subscription-Key': subscriptionKey,
    });
  });

  it('auto-fetches and caches the access token for resource requests', async () => {
    const fetchFn = vi.fn<typeof fetch>();
    fetchFn.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ access_token: 'token-123', token_type: 'Bearer', expires_in: 3600 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    fetchFn.mockResolvedValueOnce(
      new Response(JSON.stringify({ availableBalance: '1000', currency: 'EUR' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const client = createClient(fetchFn);
    const balance = await client.request<{ availableBalance: string; currency: string }>(
      'GET',
      '/v1_0/account/balance'
    );

    expect(balance).toEqual({ availableBalance: '1000', currency: 'EUR' });
    expect(fetchFn).toHaveBeenCalledTimes(2);

    const [, balanceInit] = fetchFn.mock.calls[1];
    expect(balanceInit?.headers).toMatchObject({
      Authorization: 'Bearer token-123',
      'Ocp-Apim-Subscription-Key': subscriptionKey,
      'X-Target-Environment': targetEnvironment,
    });
  });

  it('reuses a non-expired cached token', async () => {
    const fetchFn = vi.fn<typeof fetch>();
    fetchFn.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ access_token: 'token-123', token_type: 'Bearer', expires_in: 3600 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    fetchFn.mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    );

    const client = createClient(fetchFn);
    await client.createAccessToken();
    await client.request<Record<string, unknown>>('GET', '/v1_0/account/balance');
    await client.request<Record<string, unknown>>('GET', '/v1_0/account/balance');

    // Token fetch + 2 requests = 3 total calls
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it('returns undefined for 202 Accepted responses', async () => {
    const fetchFn = vi.fn<typeof fetch>();
    fetchFn.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ access_token: 'token-123', token_type: 'Bearer', expires_in: 3600 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    fetchFn.mockResolvedValueOnce(new Response(null, { status: 202 }));

    const client = createClient(fetchFn);
    const result = await client.request<void>('POST', '/v1_0/requesttopay', {
      amount: '100',
      currency: 'EUR',
      externalId: 'ext-1',
      payer: { partyIdType: 'MSISDN', partyId: '123456789' },
      payerMessage: 'test',
      payeeNote: 'test',
    });

    expect(result).toBeUndefined();
  });

  it('throws MomoError for non-2xx responses', async () => {
    const fetchFn = vi.fn<typeof fetch>();
    fetchFn.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ access_token: 'token-123', token_type: 'Bearer', expires_in: 3600 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    fetchFn.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ code: 'PAYEE_NOT_FOUND', message: 'The payee does not exist.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const client = createClient(fetchFn);
    await expect(client.request('GET', '/v1_0/account/balance')).rejects.toMatchObject({
      type: 'momo_error',
      code: 'PAYEE_NOT_FOUND',
      message: 'The payee does not exist.',
    });
  });
});
