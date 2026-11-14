import { prisma } from "../database/client.ts";

import type { CreateHistoricoVisitaDto }
  from "../dto/historicoVisita/createHistoricoVisitaDto.ts";

import type { UpdateHistoricoVisitaDto }
  from "../dto/historicoVisita/updateHistoricoVisitaDto.ts";


// Cada visita vem com o paciente embutido (o select limita os campos
// ao necessário) e com o dentista responsável.
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


// registro_antigo identifica o atendimento antigo lançado manualmente
export function create(
  data: CreateHistoricoVisitaDto & { registro_antigo?: boolean }
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
