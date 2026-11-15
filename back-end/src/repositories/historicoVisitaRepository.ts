import { prisma } from "../database/client.ts";

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
