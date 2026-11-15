import type {
  Request,
  Response,
  NextFunction,
} from "express";


import * as service from "../services/logAcessoService.ts";


export async function index(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const lista = await service.consultar(
      req.query as Record<string, unknown>
    );


    res.json(lista);
  }
  catch (error) {
    next(error);
  }
}
