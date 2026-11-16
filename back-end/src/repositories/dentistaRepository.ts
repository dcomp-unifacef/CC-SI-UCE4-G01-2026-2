import { prisma } from "../database/client.ts";

import type { StatusConsulta } from "../../generated/prisma/client.ts";

import type { CreateDentistaDto }
  from "../dto/dentista/createDentistaDto.ts";

import type { UpdateDentistaDto }
  from "../dto/dentista/updateDentistaDto.ts";


export function findAll() {
  return prisma.dentista.findMany({
    orderBy: {
      nome: "asc",
    },
  });
}


export function findById(id: number) {
  return prisma.dentista.findUnique({
    where: { id },
  });
}


export function countVisitas(id: number) {
  return prisma.historicoVisita.count({
    where: { dentista_id: id },
  });
}


export function countConsultas(id: number) {
  return prisma.consulta.count({
    where: { dentista_id: id },
  });
}


export type ResultadoDaDesativacaoDoDentista =
  | { situacao: "desativado" }
  | { situacao: "nao_aplicavel" }
  | { situacao: "com_consulta_aberta" };


export function desativarSeSemConsultaAberta(
  id: number,
  status: StatusConsulta[]
) {
  return prisma.$transaction(
    async (tx): Promise<ResultadoDaDesativacaoDoDentista> => {
      const trava = await tx.dentista.updateMany({
        where: { id, ativo: true },
        data: { ativo: true },
      });

      if (trava.count !== 1) {
        return { situacao: "nao_aplicavel" };
      }

      const abertas = await tx.consulta.count({
        where: {
          dentista_id: id,
          status: { in: status },
        },
      });

      if (abertas > 0) {
        return { situacao: "com_consulta_aberta" };
      }

      await tx.dentista.update({
        where: { id },
        data: { ativo: false },
      });

      return { situacao: "desativado" };
    },
    { maxWait: 10_000, timeout: 20_000 }
  );
}


export function create(data: CreateDentistaDto) {
  return prisma.dentista.create({
    data,
  });
}


export function update(
  id: number,
  data: UpdateDentistaDto
) {
  return prisma.dentista.update({
    where: { id },
    data,
  });
}


export function remove(id: number) {
  return prisma.dentista.delete({
    where: { id },
  });
}
