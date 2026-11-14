import type {
  Request,
  Response,
  NextFunction,
} from "express";


import * as service from "../services/configuracaoService.ts";


import type { AlteracaoConfiguracaoDto } from "../dto/configuracao/alteracaoConfiguracaoDto.ts";


type UpdateConfiguracaoRequest = Request<
  Record<string, never>,
  unknown,
  AlteracaoConfiguracaoDto
>;


export async function retrieve(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const configuracao = await service.findAtual();


    res.json(configuracao);
  }
  catch (error) {
    next(error);
  }
}


export async function update(
  req: UpdateConfiguracaoRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const configuracao = await service.update(
      req.body,
      res.locals.usuario.id
    );


    res.json(configuracao);
  }
  catch (error) {
    next(error);
  }
}
