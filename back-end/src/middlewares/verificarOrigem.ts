import type { Request, Response, NextFunction } from 'express'

import { ForbiddenError } from '../errors/ForbiddenError.ts'


const METODOS_QUE_ALTERAM = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])


export function verificarOrigem(origensPermitidas: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!METODOS_QUE_ALTERAM.has(req.method)) {
      next()
      return
    }

    const origem = req.get('origin')

    if (origem === undefined || !origensPermitidas.includes(origem)) {
      next(new ForbiddenError('Origem não autorizada.'))
      return
    }

    next()
  }
}
