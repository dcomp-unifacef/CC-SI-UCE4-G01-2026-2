import type {
  Request,
  Response,
  NextFunction,
} from "express";


import * as service from "../services/sessaoService.ts";


import * as backupService from "../services/backupService.ts";

import { Perfil } from "../../generated/prisma/client.ts";

import type { LoginDto } from "../dto/sessao/loginDto.ts";

import {
  NOME_DO_COOKIE,
  opcoesDoCookie,
  opcoesParaLimpar,
} from "../utils/cookieSessao.ts";


type LoginRequest = Request<
  Record<string, never>,
  unknown,
  LoginDto
>;


export async function create(
  req: LoginRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const sessao = await service.login(req.body);


    res.cookie(NOME_DO_COOKIE, sessao.token, opcoesDoCookie(sessao.duracaoEmMs));

    const aviso_backup =
      sessao.usuario.perfil === Perfil.DONO
        ? await backupService.avisoParaLogin()
        : null;

    res.status(201).json({
      usuario: sessao.usuario,
      expira_em: sessao.expira_em,
      ...(aviso_backup ? { aviso_backup } : {}),
    });
  }
  catch (error) {
    next(error);
  }
}


export function retrieveCurrent(
  req: Request,
  res: Response
): void {
  res.json({
    usuario: res.locals.usuario,
    expira_em: res.locals.sessao.expira_em,
  });
}


export async function remove(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await service.logout(req.cookies?.[NOME_DO_COOKIE]);


    res.clearCookie(NOME_DO_COOKIE, opcoesParaLimpar());

    res.status(204).end();
  }
  catch (error) {
    next(error);
  }
}
