import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
    private readonly logger = new Logger('HTTP');

    use(req: Request, res: Response, next: NextFunction) {
        const { method, originalUrl, body } = req;
        const userAgent = req.get('User-Agent') || '';
        const start = Date.now();

        // Log request
        this.logger.log(
            `${method} ${originalUrl} - ${userAgent} - Body: ${JSON.stringify(body)}`
        );

        // Capture response
        const originalSend = res.send;
        res.send = function (data) {
            const duration = Date.now() - start;
            const { statusCode } = res;

            // Log response
            if (statusCode >= 400) {
                this.logger.error(
                    `${method} ${originalUrl} - ${statusCode} - ${duration}ms - Response: ${data}`
                );
            } else {
                this.logger.log(
                    `${method} ${originalUrl} - ${statusCode} - ${duration}ms`
                );
            }

            return originalSend.call(this, data);
        }.bind(this);

        next();
    }
} 