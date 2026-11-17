import type {
  Request,
  Response,
  NextFunction,
} from "express";


import * as service from "../services/consultaService.ts";


import type { CadastroConsultaDto } from "../dto/consulta/cadastroConsultaDto.ts";
import type { AlteracaoStatusConsultaDto } from "../dto/consulta/alteracaoStatusConsultaDto.ts";
import type { ReagendamentoConsultaDto } from "../dto/consulta/reagendamentoConsultaDto.ts";


type ConsultaIdParams = { id: string };

type CreateConsultaRequest = Request<
  Record<string, never>,
  unknown,
  CadastroConsultaDto
>;

type StatusConsultaRequest = Request<
  ConsultaIdParams,
  unknown,
  AlteracaoStatusConsultaDto
>;

type HorarioConsultaRequest = Request<
  ConsultaIdParams,
  unknown,
  ReagendamentoConsultaDto
>;


export async function index(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const consultas = await service.findAll(
      req.query as Record<string, unknown>,
      res.locals.usuario
    );


    res.json(consultas);
  }
  catch (error) {
    next(error);
  }
}


export async function retrieve(
  req: Request<ConsultaIdParams>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const consulta = await service.findById(
      Number(req.params.id),
      res.locals.usuario
    );


    res.json(consulta);
  }
  catch (error) {
    next(error);
  }
}


export async function historico(
  req: Request<ConsultaIdParams>,
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
  req: CreateConsultaRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const consulta = await service.create(req.body, res.locals.usuario);


    res.status(201).json(consulta);
  }
  catch (error) {
    next(error);
  }
}


export async function updateStatus(
  req: StatusConsultaRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const consulta = await service.mudarStatus(
      Number(req.params.id),
      req.body,
      res.locals.usuario
    );


    res.json(consulta);
  }
  catch (error) {
    next(error);
  }
}


export async function updateHorario(
  req: HorarioConsultaRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const consulta = await service.reagendar(
      Number(req.params.id),
      req.body,
      res.locals.usuario
    );


    res.json(consulta);
  }
  catch (error) {
    next(error);
  }
}
