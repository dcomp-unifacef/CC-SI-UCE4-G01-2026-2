import type {
  Request,
  Response,
  NextFunction,
} from "express";


import * as service from "../services/retornoService.ts";


import type { CadastroRetornoDto } from "../dto/retorno/cadastroRetornoDto.ts";
import type { AlteracaoDataRetornoDto } from "../dto/retorno/alteracaoDataRetornoDto.ts";
import type { DescarteRetornoDto } from "../dto/retorno/descarteRetornoDto.ts";


type RetornoIdParams = { id: string };

type CreateRetornoRequest = Request<
  Record<string, never>,
  unknown,
  CadastroRetornoDto
>;

type DataRetornoRequest = Request<
  RetornoIdParams,
  unknown,
  AlteracaoDataRetornoDto
>;

type DescarteRequest = Request<
  RetornoIdParams,
  unknown,
  DescarteRetornoDto
>;


export async function index(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const retornos = await service.findAll(
      req.query as Record<string, unknown>,
      res.locals.usuario
    );


    res.json(retornos);
  }
  catch (error) {
    next(error);
  }
}


export async function atrasos(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const lista = await service.atrasos(
      req.query as Record<string, unknown>,
      res.locals.usuario
    );


    res.json(lista);
  }
  catch (error) {
    next(error);
  }
}


export async function retrieve(
  req: Request<RetornoIdParams>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const retorno = await service.findById(
      Number(req.params.id),
      res.locals.usuario
    );


    res.json(retorno);
  }
  catch (error) {
    next(error);
  }
}


export async function historico(
  req: Request<RetornoIdParams>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const registros = await service.historico(
      Number(req.params.id),
      res.locals.usuario
    );


    res.json(registros);
  }
  catch (error) {
    next(error);
  }
}


export async function create(
  req: CreateRetornoRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const retorno = await service.create(req.body, res.locals.usuario);


    res.status(201).json(retorno);
  }
  catch (error) {
    next(error);
  }
}


export async function updateData(
  req: DataRetornoRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const retorno = await service.corrigirData(
      Number(req.params.id),
      req.body,
      res.locals.usuario
    );


    res.json(retorno);
  }
  catch (error) {
    next(error);
  }
}


export async function descartar(
  req: DescarteRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const retorno = await service.descartar(
      Number(req.params.id),
      req.body,
      res.locals.usuario
    );


    res.json(retorno);
  }
  catch (error) {
    next(error);
  }
}
