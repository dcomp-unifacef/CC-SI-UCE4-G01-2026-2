import { prisma } from "../database/client.ts";

import {
  SituacaoRetorno,
  StatusConsulta,
  TipoHistoricoConsulta,
  TipoHistoricoRetorno,
} from "../../generated/prisma/client.ts";

import type { CreateConsultaDto }
  from "../dto/consulta/createConsultaDto.ts";

import type { ReagendarConsultaDto }
  from "../dto/consulta/reagendarConsultaDto.ts";


export const STATUS_QUE_OCUPAM_HORARIO = [
  StatusConsulta.AGENDADA,
  StatusConsulta.CONFIRMADA,
  StatusConsulta.REALIZADA,
];


const MINUTO_EM_MS = 60 * 1000;


const include = {
  paciente: {
    select: { id: true, nome: true, telefone: true },
  },
  dentista: {
    select: { id: true, nome: true },
  },
};


function buscar(id: number) {
  return prisma.consulta.findUnique({
    where: { id },
    include,
  });
}


export type ConsultaCompleta = NonNullable<Awaited<ReturnType<typeof buscar>>>;


export type ResultadoDaAlteracao =
  | { situacao: "alterada"; consulta: ConsultaCompleta }
  | { situacao: "nao_encontrada" }
  | { situacao: "paciente_inativo" }
  | { situacao: "sem_mudanca" }
  | { situacao: "alterada_por_outra_operacao" };


function calcularFim(inicio: Date, duracao_min: number): Date {
  return new Date(inicio.getTime() + duracao_min * MINUTO_EM_MS);
}


export function findById(id: number) {
  return buscar(id);
}


export function findByPeriodo(
  inicio: Date,
  fim: Date,
  dentista_id?: number
) {
  return prisma.consulta.findMany({
    where: {
      inicio_em: { lt: fim },
      fim_em: { gt: inicio },
      ...(dentista_id === undefined ? {} : { dentista_id }),
    },
    include,
    orderBy: [
      { inicio_em: "asc" },
      { id: "asc" },
    ],
  });
}


export function findByPaciente(paciente_id: number) {
  return prisma.consulta.findMany({
    where: { paciente_id },
    include,
    orderBy: [
      { inicio_em: "desc" },
      { id: "desc" },
    ],
  });
}


export function findConflitos(
  dentista_id: number,
  inicio: Date,
  fim: Date,
  excetoId?: number
) {
  return prisma.consulta.findMany({
    where: {
      dentista_id,
      status: { in: STATUS_QUE_OCUPAM_HORARIO },
      inicio_em: { lt: fim },
      fim_em: { gt: inicio },
      ...(excetoId === undefined ? {} : { id: { not: excetoId } }),
    },
    include,
    orderBy: { inicio_em: "asc" },
  });
}


export function countFuturas(
  paciente_id: number,
  agora: Date,
  status: StatusConsulta[]
) {
  return prisma.consulta.count({
    where: {
      paciente_id,
      inicio_em: { gt: agora },
      status: { in: status },
    },
  });
}


export function criarComHistorico(
  data: CreateConsultaDto,
  usuarioId: number
) {
  return prisma.$transaction(async (tx): Promise<ConsultaCompleta | null> => {
    const trava = await tx.paciente.updateMany({
      where: { id: data.paciente_id, ativo: true },
      data: { ativo: true },
    });

    if (trava.count !== 1) {
      return null;
    }

    const consulta = await tx.consulta.create({
      data: {
        paciente_id: data.paciente_id,
        dentista_id: data.dentista_id,
        inicio_em: data.inicio_em,
        duracao_min: data.duracao_min,
        fim_em: calcularFim(data.inicio_em, data.duracao_min),
        encaixe: data.encaixe ?? false,
      },
      include,
    });

    await tx.historicoConsulta.create({
      data: {
        consulta_id: consulta.id,
        tipo: TipoHistoricoConsulta.CRIACAO,
        status_novo: consulta.status,
        inicio_novo: consulta.inicio_em,
        duracao_nova_min: consulta.duracao_min,
        usuario_id: usuarioId,
      },
    });

    return consulta;
  });
}


export function mudarStatus(
  id: number,
  novoStatus: StatusConsulta,
  usuarioId: number,
  motivo?: string | null,
  exigirPacienteAtivo = false,
  origensPermitidas?: StatusConsulta[]
) {
  return prisma.$transaction(async (tx): Promise<ResultadoDaAlteracao> => {
    const atual = await tx.consulta.findUnique({
      where: { id },
      select: { status: true, paciente_id: true },
    });

    if (!atual) {
      return { situacao: "nao_encontrada" };
    }

    if (atual.status === novoStatus) {
      return { situacao: "sem_mudanca" };
    }

    if (origensPermitidas && !origensPermitidas.includes(atual.status)) {
      return { situacao: "alterada_por_outra_operacao" };
    }

    if (exigirPacienteAtivo) {
      const trava = await tx.paciente.updateMany({
        where: { id: atual.paciente_id, ativo: true },
        data: { ativo: true },
      });

      if (trava.count !== 1) {
        return { situacao: "paciente_inativo" };
      }
    }

    const { count } = await tx.consulta.updateMany({
      where: { id, status: atual.status },
      data: { status: novoStatus, atualizada_em: new Date() },
    });

    if (count !== 1) {
      return { situacao: "alterada_por_outra_operacao" };
    }

    await tx.historicoConsulta.create({
      data: {
        consulta_id: id,
        tipo: TipoHistoricoConsulta.MUDANCA_DE_STATUS,
        status_anterior: atual.status,
        status_novo: novoStatus,
        motivo: motivo ?? null,
        usuario_id: usuarioId,
      },
    });

    const consulta = await tx.consulta.findUniqueOrThrow({
      where: { id },
      include,
    });

    return { situacao: "alterada", consulta };
  });
}


export interface DadosDaRealizacao {
  data_visita: Date;
  procedimento: string;
  observacoes: string | null;
  data_prevista_retorno: Date;
  motivo: string | null;
}


export type ResultadoDaRealizacao =
  | {
      situacao: "realizada";
      consulta: ConsultaCompleta;
      visita_id: number;
      retorno_id: number;
    }
  | { situacao: "nao_encontrada" }
  | { situacao: "paciente_inativo" }
  | { situacao: "sem_mudanca" }
  | { situacao: "alterada_por_outra_operacao" }
  | { situacao: "visita_ja_existe" };


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


export async function realizarComVisita(
  id: number,
  dados: DadosDaRealizacao,
  usuarioId: number,
  statusPermitidos: StatusConsulta[]
): Promise<ResultadoDaRealizacao> {
  try {
    return await prisma.$transaction(
      async (tx): Promise<ResultadoDaRealizacao> => {
        const atual = await tx.consulta.findUnique({
          where: { id },
          select: { status: true, paciente_id: true, dentista_id: true },
        });

        if (!atual) {
          return { situacao: "nao_encontrada" };
        }

        if (atual.status === StatusConsulta.REALIZADA) {
          return { situacao: "sem_mudanca" };
        }

        if (!statusPermitidos.includes(atual.status)) {
          return { situacao: "alterada_por_outra_operacao" };
        }

        const trava = await tx.paciente.updateMany({
          where: { id: atual.paciente_id, ativo: true },
          data: { ativo: true },
        });

        if (trava.count !== 1) {
          return { situacao: "paciente_inativo" };
        }

        const { count } = await tx.consulta.updateMany({
          where: { id, status: atual.status },
          data: {
            status: StatusConsulta.REALIZADA,
            atualizada_em: new Date(),
          },
        });

        if (count !== 1) {
          return { situacao: "alterada_por_outra_operacao" };
        }

        await tx.historicoConsulta.create({
          data: {
            consulta_id: id,
            tipo: TipoHistoricoConsulta.MUDANCA_DE_STATUS,
            status_anterior: atual.status,
            status_novo: StatusConsulta.REALIZADA,
            motivo: dados.motivo,
            usuario_id: usuarioId,
          },
        });

        const visita = await tx.historicoVisita.create({
          data: {
            data_visita: dados.data_visita,
            procedimento: dados.procedimento,
            observacoes: dados.observacoes,
            paciente_id: atual.paciente_id,
            dentista_id: atual.dentista_id,
            consulta_id: id,
          },
        });

        const retorno = await tx.retorno.create({
          data: {
            paciente_id: atual.paciente_id,
            visita_origem_id: visita.id,
            data_prevista: dados.data_prevista_retorno,
          },
        });

        await tx.historicoRetorno.create({
          data: {
            retorno_id: retorno.id,
            tipo: TipoHistoricoRetorno.CRIACAO,
            situacao_nova: SituacaoRetorno.ABERTO,
            data_nova: dados.data_prevista_retorno,
            usuario_id: usuarioId,
          },
        });

        const consulta = await tx.consulta.findUniqueOrThrow({
          where: { id },
          include,
        });

        return {
          situacao: "realizada",
          consulta,
          visita_id: visita.id,
          retorno_id: retorno.id,
        };
      }
    );
  }
  catch (erro) {
    if (violouUnicidade(erro)) {
      return { situacao: "visita_ja_existe" };
    }

    throw erro;
  }
}


export function reagendar(
  id: number,
  novo: ReagendarConsultaDto,
  usuarioId: number,
  motivo?: string | null
) {
  return prisma.$transaction(async (tx): Promise<ResultadoDaAlteracao> => {
    const atual = await tx.consulta.findUnique({
      where: { id },
      select: {
        status: true,
        inicio_em: true,
        duracao_min: true,
        paciente_id: true,
      },
    });

    if (!atual) {
      return { situacao: "nao_encontrada" };
    }

    const trava = await tx.paciente.updateMany({
      where: { id: atual.paciente_id, ativo: true },
      data: { ativo: true },
    });

    if (trava.count !== 1) {
      return { situacao: "paciente_inativo" };
    }

    if (
      atual.inicio_em.getTime() === novo.inicio_em.getTime() &&
      atual.duracao_min === novo.duracao_min
    ) {
      return { situacao: "sem_mudanca" };
    }

    const { count } = await tx.consulta.updateMany({
      where: {
        id,
        status: atual.status,
        inicio_em: atual.inicio_em,
        duracao_min: atual.duracao_min,
      },
      data: {
        inicio_em: novo.inicio_em,
        duracao_min: novo.duracao_min,
        fim_em: calcularFim(novo.inicio_em, novo.duracao_min),
        atualizada_em: new Date(),
      },
    });

    if (count !== 1) {
      return { situacao: "alterada_por_outra_operacao" };
    }

    await tx.historicoConsulta.create({
      data: {
        consulta_id: id,
        tipo: TipoHistoricoConsulta.REAGENDAMENTO,
        status_novo: atual.status,
        inicio_anterior: atual.inicio_em,
        inicio_novo: novo.inicio_em,
        duracao_anterior_min: atual.duracao_min,
        duracao_nova_min: novo.duracao_min,
        motivo: motivo ?? null,
        usuario_id: usuarioId,
      },
    });

    const consulta = await tx.consulta.findUniqueOrThrow({
      where: { id },
      include,
    });

    return { situacao: "alterada", consulta };
  });
}
