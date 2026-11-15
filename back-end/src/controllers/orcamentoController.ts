import type {
  Request,
  Response,
  NextFunction,
} from "express";


import * as service from "../services/orcamentoService.ts";
import * as pdfService from "../services/orcamentoPdfService.ts";


import type { CadastroOrcamentoDto } from "../dto/orcamento/cadastroOrcamentoDto.ts";
import type { AlteracaoOrcamentoDto } from "../dto/orcamento/alteracaoOrcamentoDto.ts";
import type { AdicaoItemOrcamentoDto } from "../dto/orcamento/adicaoItemOrcamentoDto.ts";
import type { QuantidadeItemOrcamentoDto } from "../dto/orcamento/quantidadeItemOrcamentoDto.ts";
import type { DecisaoRequisicaoOrcamentoDto } from "../dto/orcamento/decisaoRequisicaoOrcamentoDto.ts";
import type { ReaberturaOrcamentoDto } from "../dto/orcamento/reaberturaOrcamentoDto.ts";


type OrcamentoIdParams = { id: string };

type ItemIdParams = { id: string; itemId: string };

type CreateOrcamentoRequest = Request<
  Record<string, never>,
  unknown,
  CadastroOrcamentoDto
>;

type CabecalhoRequest = Request<
  OrcamentoIdParams,
  unknown,
  AlteracaoOrcamentoDto
>;

type AdicaoItemRequest = Request<
  OrcamentoIdParams,
  unknown,
  AdicaoItemOrcamentoDto
>;

type QuantidadeItemRequest = Request<
  ItemIdParams,
  unknown,
  QuantidadeItemOrcamentoDto
>;

type DecisaoRequest = Request<
  OrcamentoIdParams,
  unknown,
  DecisaoRequisicaoOrcamentoDto
>;

type ReaberturaRequest = Request<
  OrcamentoIdParams,
  unknown,
  ReaberturaOrcamentoDto
>;


export async function index(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orcamentos = await service.findByPaciente(
      req.query as Record<string, unknown>
    );


    res.json(orcamentos);
  }
  catch (error) {
    next(error);
  }
}


export async function retrieve(
  req: Request<OrcamentoIdParams>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orcamento = await service.findById(Number(req.params.id));


    res.json(orcamento);
  }
  catch (error) {
    next(error);
  }
}


export async function pdf(
  req: Request<OrcamentoIdParams>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const arquivo = await pdfService.gerar(Number(req.params.id));


    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${arquivo.nomeDoArquivo}"`
    );
    res.setHeader("Cache-Control", "no-store");
    res.send(arquivo.conteudo);
  }
  catch (error) {
    next(error);
  }
}


export async function historico(
  req: Request<OrcamentoIdParams>,
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
  req: CreateOrcamentoRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orcamento = await service.create(req.body, res.locals.usuario);


    res.status(201).json(orcamento);
  }
  catch (error) {
    next(error);
  }
}


export async function updateCabecalho(
  req: CabecalhoRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orcamento = await service.updateCabecalho(
      Number(req.params.id),
      req.body,
      res.locals.usuario
    );


    res.json(orcamento);
  }
  catch (error) {
    next(error);
  }
}


export async function addItem(
  req: AdicaoItemRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orcamento = await service.adicionarItem(
      Number(req.params.id),
      req.body,
      res.locals.usuario
    );


    res.status(201).json(orcamento);
  }
  catch (error) {
    next(error);
  }
}


export async function updateItem(
  req: QuantidadeItemRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orcamento = await service.alterarQuantidade(
      Number(req.params.id),
      Number(req.params.itemId),
      req.body,
      res.locals.usuario
    );


    res.json(orcamento);
  }
  catch (error) {
    next(error);
  }
}


export async function removeItem(
  req: Request<ItemIdParams>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orcamento = await service.removerItem(
      Number(req.params.id),
      Number(req.params.itemId),
      res.locals.usuario
    );


    res.json(orcamento);
  }
  catch (error) {
    next(error);
  }
}


export async function decidir(
  req: DecisaoRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orcamento = await service.decidir(
      Number(req.params.id),
      req.body,
      res.locals.usuario
    );


    res.json(orcamento);
  }
  catch (error) {
    next(error);
  }
}


export async function corrigir(
  req: DecisaoRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orcamento = await service.corrigirDecisao(
      Number(req.params.id),
      req.body,
      res.locals.usuario
    );


    res.json(orcamento);
  }
  catch (error) {
    next(error);
  }
}


export async function reabrir(
  req: ReaberturaRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orcamento = await service.reabrir(
      Number(req.params.id),
      req.body,
      res.locals.usuario
    );


    res.json(orcamento);
  }
  catch (error) {
    next(error);
  }
}
