import { ResponseDto } from '../dtos/response.dto';

export function createResponse<T>(
  statusCode: number,
  data: T,
  message: string,
): ResponseDto<T> {
  return new ResponseDto(statusCode, data, message);
}
