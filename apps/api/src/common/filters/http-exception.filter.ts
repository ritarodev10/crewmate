import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import { FastifyReply } from 'fastify'

function toErrorCode(status: number): string {
  const map: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'UNPROCESSABLE_ENTITY',
    500: 'INTERNAL_ERROR',
  }
  return map[status] ?? 'INTERNAL_ERROR'
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<FastifyReply>()

    // Domain errors thrown from the service layer — duck-typed to survive hot-reload module identity changes
    if (
      exception instanceof Error &&
      typeof (exception as Record<string, unknown>)['httpStatus'] === 'number' &&
      typeof (exception as Record<string, unknown>)['code'] === 'string'
    ) {
      const domainErr = exception as unknown as { httpStatus: number; code: string; message: string }
      void response.status(domainErr.httpStatus).send({
        error: {
          code: domainErr.code,
          message: domainErr.message,
        },
      })
      return
    }

    // NestJS built-in HTTP exceptions (including ValidationPipe errors)
    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const body = exception.getResponse()

      let message: string
      let details: unknown

      if (typeof body === 'string') {
        message = body
      } else if (typeof body === 'object' && body !== null) {
        const bodyObj = body as Record<string, unknown>
        message =
          typeof bodyObj['message'] === 'string'
            ? bodyObj['message']
            : Array.isArray(bodyObj['message'])
              ? (bodyObj['message'] as string[]).join(', ')
              : exception.message
        details =
          Array.isArray(bodyObj['message'])
            ? { validation: bodyObj['message'] }
            : undefined
      } else {
        message = exception.message
      }

      void response.status(status).send({
        error: {
          code: toErrorCode(status),
          message,
          ...(details !== undefined ? { details } : {}),
        },
      })
      return
    }

    // Unhandled — log and return 500
    console.error('[HttpExceptionFilter] Unhandled exception:', exception)
    void response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    })
  }
}
