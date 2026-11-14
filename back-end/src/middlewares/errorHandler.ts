import type { Request, Response, NextFunction } from 'express'

import { AppError } from '../errors/AppError.ts'


// Deve ser registrado por último no app.ts, depois de todas as rotas.
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

  // Erro gerado deliberadamente pela aplicação
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ message: error.message })
    return
  }

  // Corpo da requisição com JSON malformado
  if (error instanceof SyntaxError && (error as { status?: number }).status === 400) {
    res.status(400).json({ message: 'JSON inválido.' })
    return
  }

  // Erro de sistema: registrado no terminal sem a mensagem completa,
  // porque erros do Prisma podem conter dados pessoais ou clínicos.
  const e = error as { name?: string; code?: string }
  console.error('Erro interno:', e?.name ?? 'Error', e?.code ?? '')

  res.status(500).json({ message: 'Erro interno do servidor.' })
}
