import { prisma } from "../database/client.ts";

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
