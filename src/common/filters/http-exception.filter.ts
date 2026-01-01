import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ValidationError } from 'class-validator';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Đã xảy ra lỗi không mong muốn';
        let errorCode = 'INTERNAL_SERVER_ERROR';
        let details: any = null;

        // Log lỗi để debug
        this.logger.error(
            `Exception occurred: ${exception}`,
            exception instanceof Error ? exception.stack : undefined,
        );

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();

            if (typeof exceptionResponse === 'string') {
                message = exceptionResponse;
            } else if (typeof exceptionResponse === 'object') {
                const responseObj = exceptionResponse as any;

                // Xử lý lỗi validation từ class-validator
                if (responseObj.message && Array.isArray(responseObj.message)) {
                    const validationErrors = responseObj.message as string[];
                    message = this.formatValidationErrors(validationErrors);
                    errorCode = 'VALIDATION_ERROR';
                    details = validationErrors;
                } else if (responseObj.message) {
                    message = Array.isArray(responseObj.message)
                        ? responseObj.message[0]
                        : responseObj.message;
                }

                errorCode = responseObj.error || this.getErrorCodeFromStatus(status);
            }
        } else if (exception instanceof Error) {
            // Xử lý các lỗi MongoDB
            if (exception.message.includes('E11000 duplicate key error')) {
                status = HttpStatus.CONFLICT;
                message = this.formatMongoDBDuplicateError(exception.message);
                errorCode = 'DUPLICATE_ERROR';
            } else if (exception.message.includes('ValidationError')) {
                status = HttpStatus.BAD_REQUEST;
                message = this.formatMongoDBValidationError(exception.message);
                errorCode = 'VALIDATION_ERROR';
            } else {
                message = exception.message || 'Đã xảy ra lỗi không mong muốn';
            }
        }

        // Chuẩn hóa format response
        const errorResponse = {
            success: false,
            statusCode: status,
            error: errorCode,
            message: message,
            details: details,
            timestamp: new Date().toISOString(),
            path: request.url,
        };

        response.status(status).json(errorResponse);
    }

    private getErrorCodeFromStatus(status: number): string {
        switch (status) {
            case HttpStatus.BAD_REQUEST:
                return 'BAD_REQUEST';
            case HttpStatus.UNAUTHORIZED:
                return 'UNAUTHORIZED';
            case HttpStatus.FORBIDDEN:
                return 'FORBIDDEN';
            case HttpStatus.NOT_FOUND:
                return 'NOT_FOUND';
            case HttpStatus.CONFLICT:
                return 'CONFLICT';
            case HttpStatus.UNPROCESSABLE_ENTITY:
                return 'UNPROCESSABLE_ENTITY';
            default:
                return 'INTERNAL_SERVER_ERROR';
        }
    }

    private formatValidationErrors(errors: string[]): string {
        // Mapping validation errors sang tiếng Việt
        const errorMap: Record<string, string> = {
            'name should not be empty': 'Tên sản phẩm không được để trống',
            'name must be a string': 'Tên sản phẩm phải là chuỗi ký tự',
            'barcode should not be empty': 'Mã sản phẩm không được để trống',
            'barcode must be a string': 'Mã sản phẩm phải là chuỗi ký tự',
            'costPrice must be a number': 'Giá vốn phải là số',
            'sellPrice must be a number': 'Giá bán phải là số',
            'stock must be a number': 'Số lượng tồn kho phải là số',
            'brandId should not be empty': 'Thương hiệu không được để trống',
            'categoryId should not be empty': 'Danh mục không được để trống',
            'brandId must be a mongodb id': 'ID thương hiệu không hợp lệ',
            'categoryId must be a mongodb id': 'ID danh mục không hợp lệ',
        };

        const vietnameseErrors = errors.map(error => {
            // Tìm lỗi tương ứng trong map
            const mappedError = Object.keys(errorMap).find(key =>
                error.toLowerCase().includes(key.toLowerCase())
            );

            if (mappedError) {
                return errorMap[mappedError];
            }

            // Nếu không tìm thấy, xử lý một số pattern phổ biến
            if (error.includes('must be a number')) {
                const field = error.split(' ')[0];
                return `${field} phải là số`;
            }

            if (error.includes('should not be empty')) {
                const field = error.split(' ')[0];
                return `${field} không được để trống`;
            }

            return error; // Trả về lỗi gốc nếu không map được
        });

        return vietnameseErrors.length === 1
            ? vietnameseErrors[0]
            : `Dữ liệu không hợp lệ: ${vietnameseErrors.join(', ')}`;
    }

    private formatMongoDBDuplicateError(errorMessage: string): string {
        if (errorMessage.includes('barcode_1')) {
            const barcodeMatch = errorMessage.match(/barcode: "([^"]+)"/);
            const barcode = barcodeMatch ? barcodeMatch[1] : '';
            return `Mã sản phẩm "${barcode}" đã được sử dụng. Vui lòng chọn mã khác.`;
        }

        // Removed name uniqueness check - names can be duplicated now

        if (errorMessage.includes('email_1')) {
            const emailMatch = errorMessage.match(/email: "([^"]+)"/);
            const email = emailMatch ? emailMatch[1] : '';
            return `Email "${email}" đã được đăng ký. Vui lòng sử dụng email khác.`;
        }

        return 'Dữ liệu đã tồn tại trong hệ thống. Vui lòng kiểm tra và nhập thông tin khác.';
    }

    private formatMongoDBValidationError(errorMessage: string): string {
        if (errorMessage.includes('Path `name`')) {
            return 'Tên sản phẩm không hợp lệ. Vui lòng kiểm tra lại.';
        }

        if (errorMessage.includes('Path `barcode`')) {
            return 'Mã sản phẩm không hợp lệ. Vui lòng kiểm tra lại.';
        }

        if (errorMessage.includes('Path `email`')) {
            return 'Email không đúng định dạng. Vui lòng nhập email hợp lệ.';
        }

        return 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin đã nhập.';
    }
} 