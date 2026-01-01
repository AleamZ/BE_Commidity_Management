export class ResponseDto<T> {
  statusCode: number;
  ok: boolean;
  data: T;
  message: string;

  constructor(statusCode: number, data: T, message: string) {
    this.statusCode = statusCode;
    this.ok = statusCode >= 200 && statusCode < 300;
    this.data = data;
    this.message = message ?? 'Success';
  }
}
