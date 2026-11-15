import type { Request, Response, NextFunction } from 'express'

import type { Perfil } from '../../generated/prisma/client.ts'

import { ForbiddenError } from '../errors/ForbiddenError.ts'


export function exigirPerfilPorMetodo(permissoes: Record<string, Perfil[]>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const metodo = req.method === 'HEAD' ? 'GET' : req.method
    const perfis = permissoes[metodo]
    const usuario = res.locals.usuario

    if (!perfis || !usuario || !perfis.includes(usuario.perfil)) {
      next(new ForbiddenError('Acesso negado.'))
      return
    }

    next()
  }
}
