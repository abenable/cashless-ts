import { describe, it, expect } from 'vitest';
import { CashlessClient } from '../src/client.js';
import { MomoClient } from '../src/momo/client.js';
import { AirtelClient } from '../src/airtel/client.js';

describe('CashlessClient', () => {
  it('constructs with no networks enabled', () => {
    const client = new CashlessClient();
    expect(client).toBeDefined();
    expect(client.momo).toBeUndefined();
    expect(client.airtel).toBeUndefined();
  });

  it('initializes momo when momo options are provided', () => {
    const client = new CashlessClient({
      momo: {
        apiUser: 'test-user',
        apiKey: 'test-key',
        subscriptionKey: 'test-sub',
        environment: 'sandbox',
      },
    });
    expect(client.momo).toBeInstanceOf(MomoClient);
  });

  it('initializes airtel when airtel options are provided', () => {
    const client = new CashlessClient({
      airtel: {
        clientId: 'test-id',
        clientSecret: 'test-secret',
        environment: 'sandbox',
        country: 'UG',
        currency: 'UGX',
      },
    });
    expect(client.airtel).toBeInstanceOf(AirtelClient);
  });

  it('initializes both networks when both options are provided', () => {
    const client = new CashlessClient({
      momo: {
        apiUser: 'test-user',
        apiKey: 'test-key',
        subscriptionKey: 'test-sub',
        environment: 'sandbox',
      },
      airtel: {
        clientId: 'test-id',
        clientSecret: 'test-secret',
        environment: 'production',
        country: 'UG',
        currency: 'UGX',
      },
    });
    expect(client.momo).toBeInstanceOf(MomoClient);
    expect(client.airtel).toBeInstanceOf(AirtelClient);
  });
});
