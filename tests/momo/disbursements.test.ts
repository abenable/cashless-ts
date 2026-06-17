import { describe, it, expect, vi } from 'vitest';
import { MomoClient } from '../../src/momo/client.js';
import { DisbursementsResource } from '../../src/momo/resources/disbursements.js';

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

describe('DisbursementsResource', () => {
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
    return new DisbursementsResource(client);
  }

  it('transfers funds and sends X-Reference-Id header', async () => {
    const referenceId = '550e8400-e29b-41d4-a716-446655440001';
    const fetchFn = mockFetchSequence([tokenResponse, new Response(null, { status: 202 })]);

    const resource = createResource(fetchFn);
    await resource.transfer(referenceId, {
      amount: '50',
      currency: 'UGX',
      externalId: 'ext-2',
      payee: { partyIdType: 'MSISDN', partyId: '987654321' },
      payerMessage: 'Payout',
      payeeNote: 'Enjoy',
    });

    const [url, init] = fetchFn.mock.calls[1];
    expect(url).toBe(`${baseUrl}/v1_0/transfer`);
    expect(init?.headers).toMatchObject({ 'X-Reference-Id': referenceId });
  });

  it('gets transfer status', async () => {
    const referenceId = '550e8400-e29b-41d4-a716-446655440001';
    const fetchFn = mockFetchSequence([
      tokenResponse,
      new Response(
        JSON.stringify({
          amount: '50',
          currency: 'UGX',
          externalId: 'ext-2',
          payee: { partyIdType: 'MSISDN', partyId: '987654321' },
          status: 'SUCCESSFUL',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ),
    ]);

    const resource = createResource(fetchFn);
    const status = await resource.getTransferStatus(referenceId);

    expect(status.status).toBe('SUCCESSFUL');
    const [url] = fetchFn.mock.calls[1];
    expect(url).toBe(`${baseUrl}/v1_0/transfer/${referenceId}`);
  });

  it('refunds a payment and sends X-Reference-Id header', async () => {
    const referenceId = '550e8400-e29b-41d4-a716-446655440002';
    const fetchFn = mockFetchSequence([tokenResponse, new Response(null, { status: 202 })]);

    const resource = createResource(fetchFn);
    await resource.refund(referenceId, {
      amount: '50',
      currency: 'UGX',
      externalId: 'ext-3',
      referenceIdToRefund: 'orig-ref-1',
      payerMessage: 'Refund',
      payeeNote: 'Sorry',
    });

    const [url, init] = fetchFn.mock.calls[1];
    expect(url).toBe(`${baseUrl}/v1_0/refund`);
    expect(init?.headers).toMatchObject({ 'X-Reference-Id': referenceId });
    expect(JSON.parse(init?.body as string)).toMatchObject({ referenceIdToRefund: 'orig-ref-1' });
  });

  it('gets refund status', async () => {
    const referenceId = '550e8400-e29b-41d4-a716-446655440002';
    const fetchFn = mockFetchSequence([
      tokenResponse,
      new Response(
        JSON.stringify({
          amount: '50',
          currency: 'UGX',
          externalId: 'ext-3',
          referenceIdToRefund: 'orig-ref-1',
          status: 'PENDING',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ),
    ]);

    const resource = createResource(fetchFn);
    const status = await resource.getRefundStatus(referenceId);

    expect(status.status).toBe('PENDING');
    const [url] = fetchFn.mock.calls[1];
    expect(url).toBe(`${baseUrl}/v1_0/refund/${referenceId}`);
  });
});
