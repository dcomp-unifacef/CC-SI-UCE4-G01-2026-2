import type {
  Request,
  Response,
  NextFunction,
} from "express";


import * as service from "../services/dentistaService.ts";


import type { CreateDentistaDto } from "../dto/dentista/createDentistaDto.ts";
import type { UpdateDentistaDto } from "../dto/dentista/updateDentistaDto.ts";


type DentistaIdParams = {
  id: string;
};


type CreateDentistaRequest = Request<
  Record<string, never>,
  unknown,
  CreateDentistaDto
>;


type UpdateDentistaRequest = Request<
  DentistaIdParams,
  unknown,
  UpdateDentistaDto
>;


export async function retrieveAll(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dentistas = await service.findAll();


    res.json(dentistas);
  }
  catch (error) {
    next(error);
  }
}


export async function retrieveOne(
  req: Request<DentistaIdParams>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Number(req.params.id);


    const dentista = await service.findById(id);


    res.json(dentista);
  }
  catch (error) {
    next(error);
  }
}


export async function create(
  req: CreateDentistaRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dentista = await service.create(req.body);


    res.status(201).json(dentista);
  }
  catch (error) {
    next(error);
  }
}


export async function update(
  req: UpdateDentistaRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Number(req.params.id);


    const dentista = await service.update(
      id,
      req.body
    );


    res.json(dentista);
  }
  catch (error) {
    next(error);
  }
}


export async function remove(
  req: Request<DentistaIdParams>,
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
