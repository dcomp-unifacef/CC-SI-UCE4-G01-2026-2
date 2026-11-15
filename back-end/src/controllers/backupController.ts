import type {
  Request,
  Response,
  NextFunction,
} from "express";


import * as service from "../services/backupService.ts";


type BackupIdParams = { id: string };

type VistoRequest = Request<BackupIdParams>;


export async function index(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const execucoes = await service.findAll(
      req.query as Record<string, unknown>
    );


    res.json(execucoes);
  }
  catch (error) {
    next(error);
  }
}


export async function create(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const execucao = await service.iniciarManual(res.locals.usuario.id);


    res.status(202).json(execucao);
  }
  catch (error) {
    next(error);
  }
}


export async function aviso(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const aviso = await service.aviso();


    res.json(aviso);
  }
  catch (error) {
    next(error);
  }
}


export async function visto(
  req: VistoRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const execucao = await service.marcarVisto(
      Number(req.params.id),
      res.locals.usuario.id
    );


    res.json(execucao);
  }
  catch (error) {
    next(error);
  }
}
