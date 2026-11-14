import type {
  Request,
  Response,
  NextFunction,
} from "express";


import * as service from "../services/historicoVisitaService.ts";


import type { CreateHistoricoVisitaDto } from "../dto/historicoVisita/createHistoricoVisitaDto.ts";
import type { UpdateHistoricoVisitaDto } from "../dto/historicoVisita/updateHistoricoVisitaDto.ts";


type HistoricoVisitaIdParams = {
  id: string;
};


type CreateHistoricoVisitaRequest = Request<
  Record<string, never>,
  unknown,
  CreateHistoricoVisitaDto
>;


type UpdateHistoricoVisitaRequest = Request<
  HistoricoVisitaIdParams,
  unknown,
  UpdateHistoricoVisitaDto
>;


export async function retrieveAll(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const visitas = await service.findAll();


    res.json(visitas);
  }
  catch (error) {
    next(error);
  }
}


export async function retrieveOne(
  req: Request<HistoricoVisitaIdParams>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Number(req.params.id);


    const visita = await service.findById(id);


    res.json(visita);
  }
  catch (error) {
    next(error);
  }
}


export async function create(
  req: CreateHistoricoVisitaRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const visita = await service.create(req.body);


    res.status(201).json(visita);
  }
  catch (error) {
    next(error);
  }
}


export async function createAntigo(
  req: CreateHistoricoVisitaRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const visita = await service.createAntigo(req.body);


    res.status(201).json(visita);
  }
  catch (error) {
    next(error);
  }
}


export async function update(
  req: UpdateHistoricoVisitaRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Number(req.params.id);


    const visita = await service.update(
      id,
      req.body
    );


    res.json(visita);
  }
  catch (error) {
    next(error);
  }
}


export async function remove(
  req: Request<HistoricoVisitaIdParams>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Number(req.params.id);


    await service.remove(id);


    res.status(204).end();
  }
  catch (error) {
    next(error);
  }
}
