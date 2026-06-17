import { AirtelClient, type AirtelClientOptions } from './airtel/client.js';
import { MomoClient, type MomoClientOptions } from './momo/client.js';

export interface CashlessClientOptions {
  /** MTN Mobile Money configuration. If provided, the momo network is enabled. */
  momo?: MomoClientOptions;
  /** Airtel Money configuration. If provided, the airtel network is enabled. */
  airtel?: AirtelClientOptions;
}

/**
 * CashlessClient is the unified entry point for mobile-money operations.
 *
 * Users enable one or more networks by supplying the corresponding credentials.
 * Each enabled network is exposed as a typed client, preserving the underlying
 * API's native request and response shapes.
 */
export class CashlessClient {
  /** MTN Momo client, if configured. */
  readonly momo?: MomoClient;
  /** Airtel Money client, if configured. */
  readonly airtel?: AirtelClient;

  constructor(options: CashlessClientOptions = {}) {
    if (options.momo) {
      this.momo = new MomoClient(options.momo);
    }
    if (options.airtel) {
      this.airtel = new AirtelClient(options.airtel);
    }
  }
}
