import type {
  Request,
  Response,
  NextFunction,
} from "express";


import * as service from "../services/consentimentoService.ts";


import type { CadastroConsentimentoDto } from "../dto/consentimento/cadastroConsentimentoDto.ts";


type CreateConsentimentoRequest = Request<
  Record<string, never>,
  unknown,
  CadastroConsentimentoDto
>;


export async function index(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const registros = await service.historico(
      req.query as Record<string, unknown>
    );


    res.json(registros);
  }
  catch (error) {
    next(error);
  }
}


export async function create(
  req: CreateConsentimentoRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const registro = await service.registrar(req.body, res.locals.usuario);


    res.status(201).json(registro);
  }
  catch (error) {
    next(error);
  }
}
