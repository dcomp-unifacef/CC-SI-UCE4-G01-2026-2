import type {
  Request,
  Response,
  NextFunction,
} from "express";


import * as service from "../services/contatoRetornoService.ts";


import type { CadastroContatoRetornoDto } from "../dto/contatoRetorno/cadastroContatoRetornoDto.ts";


type CreateContatoRequest = Request<
  Record<string, never>,
  unknown,
  CadastroContatoRetornoDto
>;


export async function index(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const contatos = await service.findAll(
      req.query as Record<string, unknown>,
      res.locals.usuario
    );


    res.json(contatos);
  }
  catch (error) {
    next(error);
  }
}


export async function create(
  req: CreateContatoRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const contato = await service.create(req.body, res.locals.usuario);


    res.status(201).json(contato);
  }
  catch (error) {
    next(error);
  }
}
