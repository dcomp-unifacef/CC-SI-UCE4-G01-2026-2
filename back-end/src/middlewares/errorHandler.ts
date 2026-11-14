import type { Request, Response, NextFunction } from 'express'

import { AppError } from '../errors/AppError.ts'


export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (res.headersSent) {
    next(error)
    return
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({ message: error.message })
    return
  }

  if (error instanceof SyntaxError && (error as { status?: number }).status === 400) {
    res.status(400).json({ message: 'JSON inválido.' })
    return
  }

  const e = error as { name?: string; code?: string }
  console.error('Erro interno:', e?.name ?? 'Error', e?.code ?? '')

  res.status(500).json({ message: 'Erro interno do servidor.' })
}
