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


export function liberarBloqueioVencido(id: number, agora: Date) {
  return prisma.usuario.updateMany({
    where: { id, bloqueado_ate: { lte: agora } },
    data: { tentativas_falhas: 0, bloqueado_ate: null },
  });
}


export async function reservarTentativaDeLogin(
  id: number,
  maximo: number
): Promise<boolean> {
  const { count } = await prisma.usuario.updateMany({
    where: { id, bloqueado_ate: null, tentativas_falhas: { lt: maximo } },
    data: { tentativas_falhas: { increment: 1 } },
  });

  return count === 1;
}


export function bloquearSeTentativasEsgotadas(
  id: number,
  maximo: number,
  ate: Date
) {
  return prisma.usuario.updateMany({
    where: { id, bloqueado_ate: null, tentativas_falhas: { gte: maximo } },
    data: { bloqueado_ate: ate },
  });
}


export function zerarFalhasDeLogin(id: number) {
  return prisma.usuario.update({
    where: { id },
    data: { tentativas_falhas: 0, bloqueado_ate: null },
    select: { id: true },
  });
}


