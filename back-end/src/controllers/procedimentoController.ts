import type {
  Request,
  Response,
  NextFunction,
} from "express";


import * as service from "../services/procedimentoService.ts";


import type { CadastroProcedimentoDto } from "../dto/procedimento/cadastroProcedimentoDto.ts";
import type { AlteracaoProcedimentoDto } from "../dto/procedimento/alteracaoProcedimentoDto.ts";


type ProcedimentoIdParams = { id: string };

type CreateProcedimentoRequest = Request<
  Record<string, never>,
  unknown,
  CadastroProcedimentoDto
>;

type UpdateProcedimentoRequest = Request<
  ProcedimentoIdParams,
  unknown,
  AlteracaoProcedimentoDto
>;


export async function index(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const procedimentos = await service.findAll(
      req.query as Record<string, unknown>
    );


    res.json(procedimentos);
  }
  catch (error) {
    next(error);
  }
}


export async function retrieve(
  req: Request<ProcedimentoIdParams>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const procedimento = await service.findById(Number(req.params.id));


    res.json(procedimento);
  }
  catch (error) {
    next(error);
  }
}


export async function create(
  req: CreateProcedimentoRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const procedimento = await service.create(req.body);


    res.status(201).json(procedimento);
  }
  catch (error) {
    next(error);
  }
}


export async function update(
  req: UpdateProcedimentoRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const procedimento = await service.update(
      Number(req.params.id),
      req.body
    );


    res.json(procedimento);
  }
  catch (error) {
    next(error);
  }
}
