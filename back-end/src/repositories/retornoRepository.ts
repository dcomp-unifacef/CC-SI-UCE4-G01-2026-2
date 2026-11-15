import { prisma } from "../database/client.ts";

import {
  SituacaoRetorno,
  TipoHistoricoRetorno,
} from "../../generated/prisma/client.ts";

import type { CreateRetornoDto }
  from "../dto/retorno/createRetornoDto.ts";

import type { CorrigirRetornoDto }
  from "../dto/retorno/corrigirRetornoDto.ts";

import type { DescartarRetornoDto }
  from "../dto/retorno/descartarRetornoDto.ts";


const include = {
  paciente: {
    select: { id: true, nome: true, telefone: true },
  },
  visita_origem: {
    select: { id: true, data_visita: true, dentista_id: true },
  },
};


function buscar(id: number) {
  return prisma.retorno.findUnique({
    where: { id },
    include,
  });
}


export type RetornoCompleto = NonNullable<Awaited<ReturnType<typeof buscar>>>;


export type ResultadoDoRetorno =
  | { situacao: "ok"; retorno: RetornoCompleto }
  | { situacao: "nao_encontrado" }
  | { situacao: "visita_nao_encontrada" }
  | { situacao: "ja_existe_aberto" }
  | { situacao: "paciente_inativo" }
  | { situacao: "nao_aberto" }
  | { situacao: "sem_mudanca" }
  | { situacao: "alterada_por_outra_operacao" };


function soData(data: Date): Date {
  return new Date(Date.UTC(
    data.getUTCFullYear(),
    data.getUTCMonth(),
    data.getUTCDate()
  ));
}


function violouUnicidade(erro: unknown): boolean {
  const e = erro as {
    code?: string;
    meta?: { driverAdapterError?: { cause?: { originalCode?: string } } };
  };

  return (
    e.code === "P2002" ||
    e.meta?.driverAdapterError?.cause?.originalCode === "23505"
  );
}


export function findById(id: number) {
  return buscar(id);
}


export function findByVisita(visita_origem_id: number) {
  return prisma.retorno.findMany({
    where: { visita_origem_id },
    include,
    orderBy: [
      { criado_em: "desc" },
      { id: "desc" },
    ],
  });
}


export function findAbertoByVisita(visita_origem_id: number) {
  return prisma.retorno.findFirst({
    where: { visita_origem_id, situacao: SituacaoRetorno.ABERTO },
    include,
  });
}


export function findByPaciente(paciente_id: number) {
  return prisma.retorno.findMany({
    where: { paciente_id },
    include,
    orderBy: [
      { criado_em: "desc" },
      { id: "desc" },
    ],
  });
}


export function countByVisita(visita_origem_id: number) {
  return prisma.retorno.count({
    where: { visita_origem_id },
  });
}


export async function criar(
  data: CreateRetornoDto,
  usuarioId: number
): Promise<ResultadoDoRetorno> {
  try {
    return await prisma.$transaction(async (tx): Promise<ResultadoDoRetorno> => {
      const visita = await tx.historicoVisita.findUnique({
        where: { id: data.visita_origem_id },
        select: { paciente_id: true },
      });

      if (!visita) {
        return { situacao: "visita_nao_encontrada" };
      }

      const pacienteAtivo = await tx.paciente.updateMany({
        where: { id: visita.paciente_id, ativo: true },
        data: { ativo: true },
      });

      if (pacienteAtivo.count !== 1) {
        return { situacao: "paciente_inativo" };
      }

      const trava = await tx.historicoVisita.updateMany({
        where: {
          id: data.visita_origem_id,
          paciente_id: visita.paciente_id,
        },
        data: { paciente_id: visita.paciente_id },
      });

      if (trava.count !== 1) {
        return { situacao: "alterada_por_outra_operacao" };
      }

      const aberto = await tx.retorno.findFirst({
        where: {
          visita_origem_id: data.visita_origem_id,
          situacao: SituacaoRetorno.ABERTO,
        },
        select: { id: true },
      });

      if (aberto) {
        return { situacao: "ja_existe_aberto" };
      }

      const data_prevista = soData(data.data_prevista);

      const retorno = await tx.retorno.create({
        data: {
          paciente_id: visita.paciente_id,
          visita_origem_id: data.visita_origem_id,
          data_prevista,
        },
        include,
      });

      await tx.historicoRetorno.create({
        data: {
          retorno_id: retorno.id,
          tipo: TipoHistoricoRetorno.CRIACAO,
          situacao_nova: SituacaoRetorno.ABERTO,
          data_nova: data_prevista,
          usuario_id: usuarioId,
        },
      });

      return { situacao: "ok", retorno };
    });
  }
  catch (erro) {
    if (violouUnicidade(erro)) {
      return { situacao: "ja_existe_aberto" };
    }

    throw erro;
  }
}


export function corrigirData(
  id: number,
  novo: CorrigirRetornoDto,
  usuarioId: number
) {
  return prisma.$transaction(async (tx): Promise<ResultadoDoRetorno> => {
    const atual = await tx.retorno.findUnique({
      where: { id },
      select: { situacao: true, data_prevista: true, paciente_id: true },
    });

    if (!atual) {
      return { situacao: "nao_encontrado" };
    }

    if (atual.situacao !== SituacaoRetorno.ABERTO) {
      return { situacao: "nao_aberto" };
    }

    const pacienteAtivo = await tx.paciente.updateMany({
      where: { id: atual.paciente_id, ativo: true },
      data: { ativo: true },
    });

    if (pacienteAtivo.count !== 1) {
      return { situacao: "paciente_inativo" };
    }

    const data_prevista = soData(novo.data_prevista);

    if (atual.data_prevista.getTime() === data_prevista.getTime()) {
      return { situacao: "sem_mudanca" };
    }

    const { count } = await tx.retorno.updateMany({
      where: {
        id,
        situacao: SituacaoRetorno.ABERTO,
        data_prevista: atual.data_prevista,
      },
      data: { data_prevista },
    });

    if (count !== 1) {
      return { situacao: "alterada_por_outra_operacao" };
    }

    await tx.historicoRetorno.create({
      data: {
        retorno_id: id,
        tipo: TipoHistoricoRetorno.CORRECAO_DE_DATA,
        situacao_anterior: SituacaoRetorno.ABERTO,
        situacao_nova: SituacaoRetorno.ABERTO,
        data_anterior: atual.data_prevista,
        data_nova: data_prevista,
        motivo: novo.motivo ?? null,
        usuario_id: usuarioId,
      },
    });

    const retorno = await tx.retorno.findUniqueOrThrow({
      where: { id },
      include,
    });

    return { situacao: "ok", retorno };
  });
}


export function descartar(
  id: number,
  dados: DescartarRetornoDto,
  usuarioId: number
) {
  return prisma.$transaction(async (tx): Promise<ResultadoDoRetorno> => {
    const atual = await tx.retorno.findUnique({
      where: { id },
      select: { situacao: true },
    });

    if (!atual) {
      return { situacao: "nao_encontrado" };
    }

    if (atual.situacao !== SituacaoRetorno.ABERTO) {
      return { situacao: "nao_aberto" };
    }

    const { count } = await tx.retorno.updateMany({
      where: { id, situacao: SituacaoRetorno.ABERTO },
      data: {
        situacao: SituacaoRetorno.DESCARTADO,
        encerrado_em: new Date(),
        encerrado_por_id: usuarioId,
        motivo_descarte: dados.motivo,
      },
    });

    if (count !== 1) {
      return { situacao: "alterada_por_outra_operacao" };
    }

    await tx.historicoRetorno.create({
      data: {
        retorno_id: id,
        tipo: TipoHistoricoRetorno.DESCARTE,
        situacao_anterior: SituacaoRetorno.ABERTO,
        situacao_nova: SituacaoRetorno.DESCARTADO,
        motivo: dados.motivo,
        usuario_id: usuarioId,
      },
    });

    const retorno = await tx.retorno.findUniqueOrThrow({
      where: { id },
      include,
    });

    return { situacao: "ok", retorno };
  });
}


export function encerrarComoAtendido(
  id: number,
  usuarioId: number
) {
  return prisma.$transaction(async (tx): Promise<ResultadoDoRetorno> => {
    const atual = await tx.retorno.findUnique({
      where: { id },
      select: { situacao: true },
    });

    if (!atual) {
      return { situacao: "nao_encontrado" };
    }

    if (atual.situacao !== SituacaoRetorno.ABERTO) {
      return { situacao: "nao_aberto" };
    }

    const { count } = await tx.retorno.updateMany({
      where: { id, situacao: SituacaoRetorno.ABERTO },
      data: {
        situacao: SituacaoRetorno.ATENDIDO,
        encerrado_em: new Date(),
        encerrado_por_id: usuarioId,
      },
    });

    if (count !== 1) {
      return { situacao: "alterada_por_outra_operacao" };
    }

    await tx.historicoRetorno.create({
      data: {
        retorno_id: id,
        tipo: TipoHistoricoRetorno.ATENDIMENTO,
        situacao_anterior: SituacaoRetorno.ABERTO,
        situacao_nova: SituacaoRetorno.ATENDIDO,
        usuario_id: usuarioId,
      },
    });

    const retorno = await tx.retorno.findUniqueOrThrow({
      where: { id },
      include,
    });

    return { situacao: "ok", retorno };
  });
}
