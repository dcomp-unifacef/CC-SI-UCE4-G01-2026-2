import { prisma } from "../database/client.ts";

import type { CreatePacienteDto }
  from "../dto/paciente/createPacienteDto.ts";

import type { UpdatePacienteDto }
  from "../dto/paciente/updatePacienteDto.ts";


export function findAll() {
  return prisma.paciente.findMany({
    orderBy: {
      nome: "asc",
    },
  });
}


export function findById(id: number) {
  return prisma.paciente.findUnique({
    where: { id },
  });
}


export function findByCpf(cpf: string) {
  return prisma.paciente.findUnique({
    where: { cpf },
  });
}


export function countVisitas(id: number) {
  return prisma.historicoVisita.count({
    where: { paciente_id: id },
  });
}


export function create(data: CreatePacienteDto) {
  return prisma.paciente.create({
    data,
  });
}


export function update(
  id: number,
  data: UpdatePacienteDto
) {
  return prisma.paciente.update({
    where: { id },
    data,
  });
}


export function remove(id: number) {
  return prisma.paciente.delete({
    where: { id },
  });
}
