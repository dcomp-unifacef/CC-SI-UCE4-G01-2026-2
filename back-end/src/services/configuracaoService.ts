import * as repository from "../repositories/configuracaoRepository.ts";

import type { Configuracao } from "../../generated/prisma/client.ts";
import type { AlteracaoConfiguracaoDto } from "../dto/configuracao/alteracaoConfiguracaoDto.ts";
import type { ConfiguracaoRespostaDto } from "../dto/configuracao/configuracaoRespostaDto.ts";
import type { UpdateConfiguracaoDto } from "../dto/configuracao/updateConfiguracaoDto.ts";

import { AppError } from "../errors/AppError.ts";
import { BadRequestError } from "../errors/BadRequestError.ts";
import { ConflictError } from "../errors/ConflictError.ts";

import {
  erroPrisma,
  exigirCorpo,
  inteiroOpcional,
} from "../utils/validators.ts";

import { converterHorario, formatarHorario } from "../utils/datas.ts";


const MENSAGEM_INTERNA = "Erro interno do servidor.";

const MENSAGEM_INCOMPATIVEL =
  "Os limites informados são incompatíveis com a configuração atual. Consulte a configuração e tente novamente.";

const LIMITE_DO_TIPO_INTEGER = 2147483647;

const CAMPOS = [
  "sessao_inatividade_min",
  "sessao_duracao_max_min",
  "consulta_duracao_max_min",
] as const;


function violouCheckDoBanco(error: unknown): boolean {
  const meta = (error as {
    meta?: { driverAdapterError?: { cause?: { originalCode?: string } } };
  } | null)?.meta;

  return (
    erroPrisma(error, "P2039") &&
    meta?.driverAdapterError?.cause?.originalCode === "23514"
  );
}


function paraResposta(configuracao: Configuracao): ConfiguracaoRespostaDto {
  return {
    sessao_inatividade_min: configuracao.sessao_inatividade_min,
    sessao_duracao_max_min: configuracao.sessao_duracao_max_min,
    consulta_duracao_max_min: configuracao.consulta_duracao_max_min,
    backup_horario: formatarHorario(configuracao.backup_horario_min),
    atualizado_em: configuracao.atualizado_em,
    atualizado_por_id: configuracao.atualizado_por_id,
  };
}


export async function findAtual(): Promise<ConfiguracaoRespostaDto> {
  const configuracao = await repository.find();

  if (!configuracao) {
    throw new AppError(MENSAGEM_INTERNA, 500);
  }

  return paraResposta(configuracao);
}


export async function update(
  data: AlteracaoConfiguracaoDto,
  usuarioId: number
): Promise<ConfiguracaoRespostaDto> {
  const corpo = exigirCorpo(data);

  const desconhecido = Object.keys(corpo).find(
    (chave) =>
      !(CAMPOS as readonly string[]).includes(chave) &&
      chave !== "backup_horario"
  );

  if (desconhecido !== undefined) {
    throw new BadRequestError(`O campo "${desconhecido}" não pode ser alterado.`);
  }

  const alteracoes: UpdateConfiguracaoDto = {};

  for (const campo of CAMPOS) {
    const valor = inteiroOpcional(corpo, campo);

    if (valor === undefined) continue;

    if (valor <= 0) {
      throw new BadRequestError(`O campo "${campo}" deve ser maior que zero.`);
    }

    if (valor > LIMITE_DO_TIPO_INTEGER) {
      throw new BadRequestError(`O campo "${campo}" excede o valor aceito pelo sistema.`);
    }

    alteracoes[campo] = valor;
  }

  if (corpo.backup_horario !== undefined) {
    const minutos = converterHorario(corpo.backup_horario);

    if (minutos === null) {
      throw new BadRequestError(
        'O campo "backup_horario" deve estar no formato HH:MM, de 00:00 a 23:59.'
      );
    }

    alteracoes.backup_horario_min = minutos;
  }

  if (Object.keys(alteracoes).length === 0) {
    throw new BadRequestError("Informe ao menos um limite para alterar.");
  }

  const atual = await repository.find();

  if (!atual) {
    throw new AppError(MENSAGEM_INTERNA, 500);
  }

  const inatividade = alteracoes.sessao_inatividade_min ?? atual.sessao_inatividade_min;
  const duracao = alteracoes.sessao_duracao_max_min ?? atual.sessao_duracao_max_min;

  if (inatividade > duracao) {
    throw new BadRequestError(
      "A inatividade da sessão não pode ser maior que a duração absoluta."
    );
  }

  try {
    const atualizada = await repository.update({
      ...alteracoes,
      atualizado_por_id: usuarioId,
    });

    return paraResposta(atualizada);
  }
  catch (error) {
    if (violouCheckDoBanco(error)) {
      throw new ConflictError(MENSAGEM_INCOMPATIVEL);
    }

    throw error;
  }
}
