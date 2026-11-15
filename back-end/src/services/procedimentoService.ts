import * as repository from "../repositories/procedimentoRepository.ts";

import type {
  Procedimento,
  ResultadoDoProcedimento,
} from "../repositories/procedimentoRepository.ts";
import type { CadastroProcedimentoDto } from "../dto/procedimento/cadastroProcedimentoDto.ts";
import type { AlteracaoProcedimentoDto } from "../dto/procedimento/alteracaoProcedimentoDto.ts";
import type { UpdateProcedimentoDto } from "../dto/procedimento/updateProcedimentoDto.ts";
import type { ProcedimentoRespostaDto } from "../dto/procedimento/procedimentoRespostaDto.ts";

import { BadRequestError } from "../errors/BadRequestError.ts";
import { ConflictError } from "../errors/ConflictError.ts";
import { NotFoundError } from "../errors/NotFoundError.ts";

import {
  booleanoOpcional,
  exigirCorpo,
  inteiroObrigatorio,
  textoObrigatorio,
  validarId,
} from "../utils/validators.ts";


const NOME_MAXIMO = 120;
const VALOR_MAXIMO_CENTAVOS = 100_000_000;

const MENSAGEM_NAO_ENCONTRADO = "Procedimento não encontrado.";
const MENSAGEM_NOME_EM_USO = "Já existe um procedimento com este nome.";
const MENSAGEM_NOME_LONGO =
  `O nome do procedimento deve ter no máximo ${NOME_MAXIMO} caracteres.`;
const MENSAGEM_VALOR =
  "O valor deve ser um número inteiro de centavos, maior que zero e de até 100000000 (R$ 1.000.000,00).";
const MENSAGEM_SEM_CAMPOS = "Informe ao menos um campo para alterar.";


function paraResposta(procedimento: Procedimento): ProcedimentoRespostaDto {
  return {
    id: procedimento.id,
    nome: procedimento.nome,
    valor_centavos: procedimento.valor_centavos,
    ativo: procedimento.ativo,
    criado_em: procedimento.criado_em,
    atualizado_em: procedimento.atualizado_em,
  };
}


function lerNome(corpo: Record<string, unknown>): string {
  const nome = textoObrigatorio(corpo, "nome");

  if (nome.length > NOME_MAXIMO) {
    throw new BadRequestError(MENSAGEM_NOME_LONGO);
  }

  return nome;
}


function lerValor(corpo: Record<string, unknown>): number {
  const valor = inteiroObrigatorio(corpo, "valor_centavos");

  if (valor < 1 || valor > VALOR_MAXIMO_CENTAVOS) {
    throw new BadRequestError(MENSAGEM_VALOR);
  }

  return valor;
}


function tratar(resultado: ResultadoDoProcedimento): ProcedimentoRespostaDto {
  switch (resultado.situacao) {
    case "ok":
      return paraResposta(resultado.procedimento);
    case "nao_encontrado":
      throw new NotFoundError(MENSAGEM_NAO_ENCONTRADO);
    case "nome_em_uso":
      throw new ConflictError(MENSAGEM_NOME_EM_USO);
  }
}


export async function findAll(
  query: Record<string, unknown>
): Promise<ProcedimentoRespostaDto[]> {
  let ativo: boolean | undefined;

  if (query.ativo !== undefined) {
    if (query.ativo !== "true" && query.ativo !== "false") {
      throw new BadRequestError('O parâmetro "ativo" deve ser true ou false.');
    }

    ativo = query.ativo === "true";
  }

  const procedimentos = await repository.findAll(
    ativo === undefined ? {} : { ativo }
  );

  return procedimentos.map(paraResposta);
}


export async function findById(id: number): Promise<ProcedimentoRespostaDto> {
  validarId(id);

  const procedimento = await repository.findById(id);

  if (!procedimento) {
    throw new NotFoundError(MENSAGEM_NAO_ENCONTRADO);
  }

  return paraResposta(procedimento);
}


export async function create(
  data: CadastroProcedimentoDto
): Promise<ProcedimentoRespostaDto> {
  const corpo = exigirCorpo(data);

  const nome = lerNome(corpo);
  const valor_centavos = lerValor(corpo);

  return tratar(await repository.criar({ nome, valor_centavos }));
}


export async function update(
  id: number,
  data: AlteracaoProcedimentoDto
): Promise<ProcedimentoRespostaDto> {
  validarId(id);

  const corpo = exigirCorpo(data);
  const alteracoes: UpdateProcedimentoDto = {};

  if (corpo.nome !== undefined) alteracoes.nome = lerNome(corpo);
  if (corpo.valor_centavos !== undefined) alteracoes.valor_centavos = lerValor(corpo);

  const ativo = booleanoOpcional(corpo, "ativo");
  if (ativo !== undefined) alteracoes.ativo = ativo;

  if (Object.keys(alteracoes).length === 0) {
    throw new BadRequestError(MENSAGEM_SEM_CAMPOS);
  }

  return tratar(await repository.atualizar(id, alteracoes));
}
