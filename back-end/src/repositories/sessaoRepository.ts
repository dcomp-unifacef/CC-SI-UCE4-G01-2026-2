import { prisma } from "../database/client.ts";

import type { CreateSessaoDto }
  from "../dto/sessao/createSessaoDto.ts";


const semHashDoToken = { token_hash: true } as const;

const usuarioMinimo = {
  select: { id: true, nome: true, login: true, perfil: true, ativo: true },
} as const;


export function create(data: CreateSessaoDto) {
  return prisma.sessao.create({
    data,
    omit: semHashDoToken,
  });
}


export function findByTokenHash(token_hash: string) {
  return prisma.sessao.findUnique({
    where: { token_hash },
    omit: semHashDoToken,
    include: { usuario: usuarioMinimo },
  });
}


export function touch(id: number, quando: Date) {
  return prisma.sessao.updateMany({
    where: { id },
    data: { ultimo_uso_em: quando },
  });
}


export function revoke(id: number, quando: Date) {
  return prisma.sessao.updateMany({
    where: { id, revogada_em: null },
    data: { revogada_em: quando },
  });
}


export function revokeAllByUsuario(usuarioId: number, quando: Date) {
  return prisma.sessao.updateMany({
    where: { usuario_id: usuarioId, revogada_em: null },
    data: { revogada_em: quando },
  });
}


export function countExpiradas(antes: Date, usuarioId?: number) {
  return prisma.sessao.count({
    where: {
      expira_em: { lt: antes },
      ...(usuarioId === undefined ? {} : { usuario_id: usuarioId }),
    },
  });
}


export async function removerExpiradasEmLote(antes: Date, tamanho: number) {
  const lote = await prisma.sessao.findMany({
    where: { expira_em: { lt: antes } },
    select: { id: true },
    orderBy: [{ expira_em: "asc" }, { id: "asc" }],
    take: tamanho,
  });

  if (lote.length === 0) {
    return 0;
  }

  const { count } = await prisma.sessao.deleteMany({
    where: {
      id: { in: lote.map((sessao) => sessao.id) },
      expira_em: { lt: antes },
    },
  });

  return count;
}


export function deleteExpiradas(antes: Date, usuarioId?: number) {
  return prisma.sessao.deleteMany({
    where: {
      expira_em: { lt: antes },
      ...(usuarioId === undefined ? {} : { usuario_id: usuarioId }),
    },
  });
}
