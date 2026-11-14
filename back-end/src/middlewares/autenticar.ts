import type { Request, Response, NextFunction } from 'express'

import * as service from '../services/sessaoService.ts'

import { NOME_DO_COOKIE } from '../utils/cookieSessao.ts'


export async function autenticar(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const sessao = await service.validar(req.cookies?.[NOME_DO_COOKIE])

    res.locals.usuario = sessao.usuario
    res.locals.sessao = { id: sessao.id, expira_em: sessao.expira_em }

    next()
  }
  catch (error) {
    next(error)
  }
}
