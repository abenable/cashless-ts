import { describe, it, expect, vi } from 'vitest';
import { MomoClient } from '../../src/momo/client.js';
import { CommonResource } from '../../src/momo/resources/common.js';

function mockFetchSequence(responses: (Response | (() => Response))[]): typeof fetch {
  const fetchFn = vi.fn<typeof fetch>();
  for (const response of responses) {
    fetchFn.mockImplementationOnce(() =>
      Promise.resolve(typeof response === 'function' ? response() : response)
    );
  }
  fetchFn.mockImplementation(() =>
    Promise.resolve(new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } }))
  );
  return fetchFn;
}

function tokenResponse(): Response {
  return new Response(
    JSON.stringify({ access_token: 'token-123', token_type: 'Bearer', expires_in: 3600 }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

describe('CommonResource', () => {
  const baseUrl = 'https://sandbox.momodeveloper.mtn.com';

  function createResource(fetchFn: typeof fetch) {
    const client = new MomoClient({
      apiUser: 'user',
      apiKey: 'key',
      subscriptionKey: 'sub',
      baseUrl,
      targetEnvironment: 'sandbox',
      fetchFn,
    });
    return new CommonResource(client);
  }

  it('gets account balance', async () => {
    const fetchFn = mockFetchSequence([
      tokenResponse,
      new Response(JSON.stringify({ availableBalance: '1500.00', currency: 'UGX' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ]);

    const resource = createResource(fetchFn);
    const balance = await resource.getBalance();

    expect(balance).toEqual({ availableBalance: '1500.00', currency: 'UGX' });
    const [, init] = fetchFn.mock.calls[1];
    expect(init?.method).toBe('GET');
  });

  it('validates an account holder status', async () => {
    const fetchFn = mockFetchSequence([
      tokenResponse,
      new Response(JSON.stringify({ result: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ]);

    const resource = createResource(fetchFn);
    const active = await resource.validateAccountHolder('MSISDN', '256123456789');

    expect(active).toEqual({ result: true });
    const [url] = fetchFn.mock.calls[1];
    expect(url).toBe(`${baseUrl}/v1_0/accountholder/MSISDN/256123456789/active`);
  });
});
