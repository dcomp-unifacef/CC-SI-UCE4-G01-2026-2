import { prisma } from "../database/client.ts";

import type { HistoricoVisita } from "../../generated/prisma/client.ts";

import type { CreateHistoricoVisitaDto }
  from "../dto/historicoVisita/createHistoricoVisitaDto.ts";

import type { UpdateHistoricoVisitaDto }
  from "../dto/historicoVisita/updateHistoricoVisitaDto.ts";


const include = {
  paciente: {
    select: { id: true, nome: true, telefone: true },
  },
  dentista: {
    select: { id: true, nome: true },
  },
};


export function findAll() {
  return prisma.historicoVisita.findMany({
    include,
    orderBy: {
      data_visita: "desc",
    },
  });
}


export function findById(id: number) {
  return prisma.historicoVisita.findUnique({
    where: { id },
    include,
  });
}


export function findByConsulta(consulta_id: number) {
  return prisma.historicoVisita.findUnique({
    where: { consulta_id },
    include,
  });
}


export function findUltimasVisitasDePacientesAtivos() {
  return prisma.historicoVisita.findMany({
    where: { paciente: { ativo: true } },
    distinct: ["paciente_id"],
    orderBy: [
      { paciente_id: "asc" },
      { data_visita: "desc" },
      { id: "desc" },
    ],
    include: {
      ...include,
      retornos: {
        select: { id: true, data_prevista: true, situacao: true },
      },
    },
  });
}


export function findMaisRecenteDoPaciente(paciente_id: number) {
  return prisma.historicoVisita.findFirst({
    where: { paciente_id },
    include: {
      ...include,
      retornos: {
        orderBy: [
          { criado_em: "desc" },
          { id: "desc" },
        ],
      },
    },
    orderBy: [
      { data_visita: "desc" },
      { id: "desc" },
    ],
  });
}


export async function contarVinculos(id: number) {
  const visita = await prisma.historicoVisita.findUnique({
    where: { id },
    select: {
      consulta_id: true,
      _count: { select: { retornos: true } },
    },
  });

  if (!visita) {
    return null;
  }

  return {
    retornos: visita._count.retornos,
    consulta_id: visita.consulta_id,
  };
}


export function create(
  data: CreateHistoricoVisitaDto & {
    registro_antigo?: boolean;
    consulta_id?: number | null;
  }
) {
  return prisma.historicoVisita.create({
    data,
  });
}


export type ResultadoDaTrocaDePaciente =
  | { situacao: "alterada"; visita: HistoricoVisita }
  | { situacao: "nao_encontrada" }
  | { situacao: "alterada_por_outra_operacao" }
  | { situacao: "com_retorno" }
  | { situacao: "com_consulta" };


export function updateComTrocaDePaciente(
  id: number,
  data: UpdateHistoricoVisitaDto & { paciente_id: number }
) {
  return prisma.$transaction(
    async (tx): Promise<ResultadoDaTrocaDePaciente> => {
      const atual = await tx.historicoVisita.findUnique({
        where: { id },
        select: { paciente_id: true },
      });

      if (!atual) {
        return { situacao: "nao_encontrada" };
      }

      const trava = await tx.historicoVisita.updateMany({
        where: { id, paciente_id: atual.paciente_id },
        data: { paciente_id: atual.paciente_id },
      });

      if (trava.count !== 1) {
        return { situacao: "alterada_por_outra_operacao" };
      }

      const vinculos = await tx.historicoVisita.findUniqueOrThrow({
        where: { id },
        select: {
          consulta_id: true,
          _count: { select: { retornos: true } },
        },
      });

      if (vinculos._count.retornos > 0) {
        return { situacao: "com_retorno" };
      }

      if (vinculos.consulta_id !== null) {
        return { situacao: "com_consulta" };
      }

      const visita = await tx.historicoVisita.update({
        where: { id },
        data,
      });

      return { situacao: "alterada", visita };
    }
  );
}


export function update(
  id: number,
  data: UpdateHistoricoVisitaDto
) {
  return prisma.historicoVisita.update({
    where: { id },
    data,
  });
}


export function remove(id: number) {
  return prisma.historicoVisita.delete({
    where: { id },
  });
}
