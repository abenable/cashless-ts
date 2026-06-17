export interface MomoErrorJson {
  code: string;
  message: string;
  requestId?: string;
}

export class MomoError extends Error {
  readonly type: string;
  readonly code: string;
  readonly requestId?: string;

  constructor(type: string, code: string, message: string, requestId?: string) {
    super(message);
    this.name = 'MomoError';
    this.type = type;
    this.code = code;
    this.requestId = requestId;
  }

  static async fromResponse(response: Response): Promise<MomoError> {
    let body: MomoErrorJson | undefined;
    try {
      body = (await response.json()) as MomoErrorJson;
    } catch {
      // ignore invalid JSON bodies
    }

    return new MomoError(
      'momo_error',
      body?.code ?? `http_${response.status}`,
      body?.message ?? response.statusText,
      body?.requestId
    );
  }
}
