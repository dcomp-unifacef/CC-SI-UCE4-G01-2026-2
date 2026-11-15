import * as repository from "../repositories/consentimentoRepository.ts";
import * as pacienteRepository from "../repositories/pacienteRepository.ts";

import { AcaoConsentimento } from "../../generated/prisma/client.ts";

import type {
  ConsentimentoRegistrado,
  ResultadoDoConsentimento,
} from "../repositories/consentimentoRepository.ts";
import type { UsuarioAutenticado } from "./consultaService.ts";
import type { CadastroConsentimentoDto } from "../dto/consentimento/cadastroConsentimentoDto.ts";
import type { ConsentimentoRespostaDto } from "../dto/consentimento/consentimentoRespostaDto.ts";
import type { ConsentimentoResumoRespostaDto } from "../dto/consentimento/consentimentoResumoRespostaDto.ts";

import { BadRequestError } from "../errors/BadRequestError.ts";
import { ConflictError } from "../errors/ConflictError.ts";
import { NotFoundError } from "../errors/NotFoundError.ts";

import {
  exigirCorpo,
  idDaQuery,
  inteiroObrigatorio,
  textoObrigatorio,
  validarId,
} from "../utils/validators.ts";


const TERMO_MAXIMO = 60;

const MENSAGEM_PACIENTE_NAO_ENCONTRADO = "Paciente não encontrado.";
const MENSAGEM_JA_CONCEDIDO = "O paciente já tem o consentimento concedido.";
const MENSAGEM_NAO_CONCEDIDO =
  "Não há consentimento concedido para revogar.";
const MENSAGEM_ACAO =
  'A ação deve ser "CONCESSAO" ou "REVOGACAO".';
const MENSAGEM_TERMO_LONGO =
  `A identificação do termo deve ter no máximo ${TERMO_MAXIMO} caracteres.`;


export function paraResumo(
  ultimo: ConsentimentoRegistrado | null | undefined
): ConsentimentoResumoRespostaDto {
  return {
    situacao: repository.situacaoDoConsentimento(ultimo),
    termo: ultimo?.termo ?? null,
    registrado_em: ultimo?.registrado_em ?? null,
    registrado_por: ultimo
      ? { id: ultimo.registrado_por.id, nome: ultimo.registrado_por.nome }
      : null,
  };
}


function paraResposta(registro: ConsentimentoRegistrado): ConsentimentoRespostaDto {
  return {
    id: registro.id,
    paciente_id: registro.paciente_id,
    acao: registro.acao,
    termo: registro.termo,
    registrado_em: registro.registrado_em,
    registrado_por: {
      id: registro.registrado_por.id,
      nome: registro.registrado_por.nome,
    },
  };
}


function tratar(resultado: ResultadoDoConsentimento): ConsentimentoRespostaDto {
  switch (resultado.situacao) {
    case "ok":
      return paraResposta(resultado.registro);
    case "paciente_nao_encontrado":
      throw new NotFoundError(MENSAGEM_PACIENTE_NAO_ENCONTRADO);
    case "ja_concedido":
      throw new ConflictError(MENSAGEM_JA_CONCEDIDO);
    case "nao_concedido":
      throw new ConflictError(MENSAGEM_NAO_CONCEDIDO);
  }
}


export async function resumoDoPaciente(
  paciente_id: number
): Promise<ConsentimentoResumoRespostaDto> {
  return paraResumo(await repository.findUltimo(paciente_id));
}


export async function resumosDosPacientes(
  ids: number[]
): Promise<Map<number, ConsentimentoResumoRespostaDto>> {
  const ultimos = await repository.findUltimosPorPacientes(ids);
  const resumos = new Map<number, ConsentimentoResumoRespostaDto>();

  for (const id of new Set(ids)) {
    resumos.set(id, paraResumo(ultimos.get(id)));
  }

  return resumos;
}


export async function historico(
  query: Record<string, unknown>
): Promise<ConsentimentoRespostaDto[]> {
  const paciente_id = idDaQuery(query, "paciente_id");

  if (paciente_id === undefined) {
    throw new BadRequestError('Informe "paciente_id".');
  }

  const paciente = await pacienteRepository.findById(paciente_id);

  if (!paciente) {
    throw new NotFoundError(MENSAGEM_PACIENTE_NAO_ENCONTRADO);
  }

  const registros = await repository.findHistorico(paciente_id);

  return registros.map(paraResposta);
}


export async function registrar(
  data: CadastroConsentimentoDto,
  usuario: UsuarioAutenticado
): Promise<ConsentimentoRespostaDto> {
  const corpo = exigirCorpo(data);

  const paciente_id = inteiroObrigatorio(corpo, "paciente_id");
  validarId(paciente_id);

  const acao = textoObrigatorio(corpo, "acao");

  if (
    acao !== AcaoConsentimento.CONCESSAO &&
    acao !== AcaoConsentimento.REVOGACAO
  ) {
    throw new BadRequestError(MENSAGEM_ACAO);
  }

  const termo = textoObrigatorio(corpo, "termo");

  if (termo.length > TERMO_MAXIMO) {
    throw new BadRequestError(MENSAGEM_TERMO_LONGO);
  }

  return tratar(
    await repository.registrar({ paciente_id, acao, termo }, usuario.id)
  );
}
