export interface AirtelErrorJson {
  code: string;
  message: string;
  requestId?: string;
}

export class AirtelError extends Error {
  readonly type: string;
  readonly code: string;
  readonly requestId?: string;

  constructor(type: string, code: string, message: string, requestId?: string) {
    super(message);
    this.name = 'AirtelError';
    this.type = type;
    this.code = code;
    this.requestId = requestId;
  }

  static async fromResponse(response: Response): Promise<AirtelError> {
    let body: AirtelErrorJson | undefined;
    try {
      body = (await response.json()) as AirtelErrorJson;
    } catch {
      // ignore invalid JSON bodies
    }

    return new AirtelError(
      'airtel_error',
      body?.code ?? `http_${response.status}`,
      body?.message ?? response.statusText,
      body?.requestId
    );
  }
}
