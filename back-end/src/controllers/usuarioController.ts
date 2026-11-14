import type {
  Request,
  Response,
  NextFunction,
} from "express";


import * as service from "../services/usuarioService.ts";


import type { AlteracaoUsuarioDto } from "../dto/usuario/alteracaoUsuarioDto.ts";
import type { CadastroUsuarioDto } from "../dto/usuario/cadastroUsuarioDto.ts";
import type { RedefinicaoSenhaDto } from "../dto/usuario/redefinicaoSenhaDto.ts";
import type { TrocaSenhaDto } from "../dto/usuario/trocaSenhaDto.ts";

import {
  NOME_DO_COOKIE,
  opcoesParaLimpar,
} from "../utils/cookieSessao.ts";


type UsuarioIdParams = {
  id: string;
};


type CreateUsuarioRequest = Request<
  Record<string, never>,
  unknown,
  CadastroUsuarioDto
>;


type UpdateUsuarioRequest = Request<
  UsuarioIdParams,
  unknown,
  AlteracaoUsuarioDto
>;


type ResetPasswordRequest = Request<
  UsuarioIdParams,
  unknown,
  RedefinicaoSenhaDto
>;


type ChangeOwnPasswordRequest = Request<
  Record<string, never>,
  unknown,
  TrocaSenhaDto
>;


export async function retrieveAll(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const usuarios = await service.findAll();


    res.json(usuarios);
  }
  catch (error) {
    next(error);
  }
}


export async function retrieveOne(
  req: Request<UsuarioIdParams>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Number(req.params.id);


    const usuario = await service.findById(id);


    res.json(usuario);
  }
  catch (error) {
    next(error);
  }
}


export async function create(
  req: CreateUsuarioRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const usuario = await service.create(req.body);


    res.status(201).json(usuario);
  }
  catch (error) {
    next(error);
  }
}


export async function update(
  req: UpdateUsuarioRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Number(req.params.id);


    const usuario = await service.update(
      id,
      req.body
    );


    res.json(usuario);
  }
  catch (error) {
    next(error);
  }
}


export async function resetPassword(
  req: ResetPasswordRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Number(req.params.id);


    await service.redefinirSenha(
      id,
      req.body,
      res.locals.usuario.id
    );


    res.status(204).end();
  }
  catch (error) {
    next(error);
  }
}


export async function changeOwnPassword(
  req: ChangeOwnPasswordRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await service.trocarPropriaSenha(
      res.locals.usuario,
      req.body
    );


    res.clearCookie(NOME_DO_COOKIE, opcoesParaLimpar());

    res.status(204).end();
  }
  catch (error) {
    next(error);
  }
}
