import { AirtelError } from './errors.js';
import { CollectionsResource } from './resources/collections.js';
import { CommonResource } from './resources/common.js';
import { DisbursementsResource } from './resources/disbursements.js';

export type AirtelEnvironment = 'sandbox' | 'production';

export const AIRTEL_SANDBOX_BASE_URL = 'https://openapiuat.airtel.ug';
export const AIRTEL_PRODUCTION_BASE_URL = 'https://openapi.airtel.ug';

export interface AirtelClientOptions {
  clientId: string;
  clientSecret: string;
  /** If omitted, `environment` together with `country` determines the default Airtel base URL. */
  baseUrl?: string;
  /** Determines the default Airtel base URL when `baseUrl` is not provided. */
  environment?: AirtelEnvironment;
  country: string;
  currency: string;
  fetchFn?: typeof fetch;
}

function resolveAirtelBaseUrl(
  options: Pick<AirtelClientOptions, 'baseUrl' | 'environment' | 'country'>
): string {
  if (options.baseUrl) {
    return options.baseUrl;
  }
  if (options.country?.toUpperCase() === 'UG') {
    return options.environment === 'production'
      ? AIRTEL_PRODUCTION_BASE_URL
      : AIRTEL_SANDBOX_BASE_URL;
  }
  throw new Error(
    'AirtelClient: `baseUrl` is required for countries other than Uganda (UG). Provide a baseUrl explicitly.'
  );
}

interface AccessTokenResponse {
  access_token: string;
  expires_in: string;
  token_type: string;
}

export interface AirtelAccessToken {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

export class AirtelClient {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private readonly country: string;
  private readonly currency: string;
  private readonly fetchFn: typeof fetch;

  private accessToken: string | null = null;
  private tokenExpiry = 0;

  disbursements = new DisbursementsResource(this);
  collections = new CollectionsResource(this);
  common = new CommonResource(this);

  constructor(options: AirtelClientOptions) {
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
    this.baseUrl = resolveAirtelBaseUrl(options).replace(/\/+$/, '');
    this.country = options.country;
    this.currency = options.currency;
    this.fetchFn = options.fetchFn ?? fetch;
  }

  async createAccessToken(): Promise<AirtelAccessToken> {
    const response = await this.fetchFn(`${this.baseUrl}/auth/oauth2/token`, {
      method: 'POST',
      headers: {
        Accept: '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'client_credentials',
      }),
    });

    if (!response.ok) {
      throw await AirtelError.fromResponse(response);
    }

    const body = (await response.json()) as AccessTokenResponse;
    const expiresIn = Number(body.expires_in);
    this.accessToken = body.access_token;
    this.tokenExpiry = Date.now() + expiresIn * 1000;

    return {
      accessToken: body.access_token,
      tokenType: body.token_type,
      expiresIn,
    };
  }

  private async ensureAccessToken(): Promise<string> {
    const refreshBufferMs = 60_000;
    if (this.accessToken && Date.now() < this.tokenExpiry - refreshBufferMs) {
      return this.accessToken;
    }
    const token = await this.createAccessToken();
    return token.accessToken;
  }

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    extraHeaders?: Record<string, string>
  ): Promise<T> {
    const token = await this.ensureAccessToken();
    const url = `${this.baseUrl}${path}`;
    const response = await this.fetchFn(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: '*/*',
        'X-Country': this.country,
        'X-Currency': this.currency,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...extraHeaders,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw await AirtelError.fromResponse(response);
    }

    if (response.status === 202 || response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }
}
