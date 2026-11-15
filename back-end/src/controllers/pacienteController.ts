import type {
  Request,
  Response,
  NextFunction,
} from "express";


import * as service from "../services/pacienteService.ts";


import type { CreatePacienteDto } from "../dto/paciente/createPacienteDto.ts";
import type { UpdatePacienteDto } from "../dto/paciente/updatePacienteDto.ts";


type PacienteIdParams = {
  id: string;
};


type CreatePacienteRequest = Request<
  Record<string, never>,
  unknown,
  CreatePacienteDto
>;


type UpdatePacienteRequest = Request<
  PacienteIdParams,
  unknown,
  UpdatePacienteDto
>;


export async function retrieveAll(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const pacientes = await service.findAll(
      req.query as Record<string, unknown>
    );


    res.json(pacientes);
  }
  catch (error) {
    next(error);
  }
}


export async function retrieveOne(
  req: Request<PacienteIdParams>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Number(req.params.id);


    const paciente = await service.findById(id);


    res.json(paciente);
  }
  catch (error) {
    next(error);
  }
}


export async function create(
  req: CreatePacienteRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const paciente = await service.create(req.body);


    res.status(201).json(paciente);
  }
  catch (error) {
    next(error);
  }
}


export async function update(
  req: UpdatePacienteRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Number(req.params.id);


    const paciente = await service.update(
      id,
      req.body
    );


    res.json(paciente);
  }
  catch (error) {
    next(error);
  }
}


export async function remove(
  req: Request<PacienteIdParams>,
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
