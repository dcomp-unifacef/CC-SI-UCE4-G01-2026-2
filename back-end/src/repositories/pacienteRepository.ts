import { prisma } from "../database/client.ts";

import type { StatusConsulta } from "../../generated/prisma/client.ts";

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


export function findByCpfPrefixo(
  prefixo: string,
  incluirDesativados: boolean,
  limite: number
) {
  return prisma.paciente.findMany({
    where: {
      cpf: { startsWith: prefixo },
      ...(incluirDesativados ? {} : { ativo: true }),
    },
    orderBy: [
      { nome: "asc" },
      { id: "asc" },
    ],
    take: limite,
  });
}


export function findIdsENomes(incluirDesativados: boolean) {
  return prisma.paciente.findMany({
    where: incluirDesativados ? {} : { ativo: true },
    select: { id: true, nome: true },
    orderBy: [
      { nome: "asc" },
      { id: "asc" },
    ],
  });
}


export function findByIds(ids: number[]) {
  return prisma.paciente.findMany({
    where: { id: { in: ids } },
    orderBy: [
      { nome: "asc" },
      { id: "asc" },
    ],
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


export function countConsultas(id: number) {
  return prisma.consulta.count({
    where: { paciente_id: id },
  });
}


export type ResultadoDaDesativacao =
  | { situacao: "desativado" }
  | { situacao: "nao_aplicavel" }
  | { situacao: "com_consulta_futura" };


export function desativarSeSemConsultaFutura(
  id: number,
  agora: Date,
  status: StatusConsulta[]
) {
  return prisma.$transaction(async (tx): Promise<ResultadoDaDesativacao> => {
    const trava = await tx.paciente.updateMany({
      where: { id, ativo: true },
      data: { ativo: true },
    });

    if (trava.count !== 1) {
      return { situacao: "nao_aplicavel" };
    }

    const futuras = await tx.consulta.count({
      where: {
        paciente_id: id,
        inicio_em: { gt: agora },
        status: { in: status },
      },
    });

    if (futuras > 0) {
      return { situacao: "com_consulta_futura" };
    }

    await tx.paciente.update({
      where: { id },
      data: { ativo: false },
    });

    return { situacao: "desativado" };
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
