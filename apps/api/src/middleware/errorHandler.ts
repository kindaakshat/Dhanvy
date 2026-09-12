import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('[API Error]:', err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload format',
        details: err.flatten().fieldErrors,
      },
    });
  }

  const statusCode = err.status || err.statusCode || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An unexpected error occurred in TrustLayer engine.';

  res.status(statusCode).json({
    error: {
      code,
      message,
      details: err.details || {},
    },
  });
}
