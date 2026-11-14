import type { Request, Response, NextFunction } from 'express'

import type { Perfil } from '../../generated/prisma/client.ts'

import { ForbiddenError } from '../errors/ForbiddenError.ts'


export function exigirPerfil(...perfis: Perfil[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const usuario = res.locals.usuario

    if (!usuario || !perfis.includes(usuario.perfil)) {
      next(new ForbiddenError('Acesso negado.'))
      return
    }

    next()
  }
}
