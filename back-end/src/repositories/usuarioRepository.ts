import { prisma } from "../database/client.ts";

import type { CreateUsuarioDto }
  from "../dto/usuario/createUsuarioDto.ts";

import type { UpdateUsuarioDto }
  from "../dto/usuario/updateUsuarioDto.ts";

import type { LoginNormalizado } from "../utils/login.ts";

import { Perfil } from "../../generated/prisma/client.ts";
import { BLOQUEIO_DONOS } from "../database/bloqueios.ts";


const semSenha = { senha_hash: true } as const;


export function findAll() {
  return prisma.usuario.findMany({
    omit: semSenha,
    orderBy: {
      nome: "asc",
    },
  });
}


export function findById(id: number) {
  return prisma.usuario.findUnique({
    where: { id },
    omit: semSenha,
  });
}


export function findByLogin(login: LoginNormalizado) {
  return prisma.usuario.findUnique({
    where: { login },
    omit: semSenha,
  });
}


export function findCredenciaisByLogin(login: LoginNormalizado) {
  return prisma.usuario.findUnique({
    where: { login },
    select: {
      id: true,
      login: true,
      senha_hash: true,
      perfil: true,
      ativo: true,
      tentativas_falhas: true,
      bloqueado_ate: true,
    },
  });
}


export function create(data: CreateUsuarioDto) {
  return prisma.usuario.create({
    data,
    omit: semSenha,
  });
}


export function update(
  id: number,
  data: UpdateUsuarioDto
) {
  return prisma.usuario.update({
    where: { id },
    data,
    omit: semSenha,
  });
}


export function contarUsuarios() {
  return prisma.usuario.count();
}


export function criarPrimeiroDono(data: Omit<CreateUsuarioDto, "perfil">) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 AS bloqueado FROM (SELECT pg_advisory_xact_lock(${BLOQUEIO_DONOS}::bigint)) AS trava`;

    if (await tx.usuario.count() > 0) {
      return null;
    }

    return tx.usuario.create({
      data: { ...data, perfil: Perfil.DONO },
      omit: semSenha,
    });
  });
}


