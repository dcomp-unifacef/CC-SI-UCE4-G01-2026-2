import type {
  Request,
  Response,
  NextFunction,
} from "express";


import * as service from "../services/ultimaVisitaService.ts";


type PacienteIdParams = { id: string };


export async function retrieve(
  req: Request<PacienteIdParams>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const resposta = await service.ultimaVisita(Number(req.params.id));


    res.json(resposta);
  }
  catch (error) {
    next(error);
  }
}
