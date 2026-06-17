import { describe, it, expect, vi } from 'vitest';
import { MomoClient } from '../../src/momo/client.js';
import { CollectionsResource } from '../../src/momo/resources/collections.js';

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

describe('CollectionsResource', () => {
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
    return new CollectionsResource(client);
  }

  it('requests a payment and sends X-Reference-Id header', async () => {
    const referenceId = '550e8400-e29b-41d4-a716-446655440000';
    const fetchFn = mockFetchSequence([
      tokenResponse,
      new Response(null, { status: 202 }),
    ]);

    const resource = createResource(fetchFn);
    await resource.requestToPay(referenceId, {
      amount: '100',
      currency: 'EUR',
      externalId: 'ext-1',
      payer: { partyIdType: 'MSISDN', partyId: '123456789' },
      payerMessage: 'Pay me',
      payeeNote: 'Thanks',
    });

    const [, init] = fetchFn.mock.calls[1];
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({
      'X-Reference-Id': referenceId,
    });
    expect(JSON.parse(init?.body as string)).toEqual({
      amount: '100',
      currency: 'EUR',
      externalId: 'ext-1',
      payer: { partyIdType: 'MSISDN', partyId: '123456789' },
      payerMessage: 'Pay me',
      payeeNote: 'Thanks',
    });
  });

  it('gets request-to-pay status', async () => {
    const referenceId = '550e8400-e29b-41d4-a716-446655440000';
    const fetchFn = mockFetchSequence([
      tokenResponse,
      new Response(
        JSON.stringify({
          amount: '100',
          currency: 'EUR',
          externalId: 'ext-1',
          financialTransactionId: 'ftx-1',
          payer: { partyIdType: 'MSISDN', partyId: '123456789' },
          status: 'SUCCESSFUL',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ),
    ]);

    const resource = createResource(fetchFn);
    const status = await resource.getRequestToPayStatus(referenceId);

    expect(status).toEqual({
      amount: '100',
      currency: 'EUR',
      externalId: 'ext-1',
      financialTransactionId: 'ftx-1',
      payer: { partyIdType: 'MSISDN', partyId: '123456789' },
      status: 'SUCCESSFUL',
    });
    const [url] = fetchFn.mock.calls[1];
    expect(url).toBe(`${baseUrl}/v1_0/requesttopay/${referenceId}`);
  });
});
