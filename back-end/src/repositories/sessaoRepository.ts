import { prisma } from "../database/client.ts";

import type { CreateSessaoDto }
  from "../dto/sessao/createSessaoDto.ts";


// O hash do token não sai nas respostas, e o usuário vem apenas com os
// campos mínimos (nunca senha_hash).
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


// A validade da sessão (expirada, inativa, revogada, usuário ativo) é regra
// de negócio: fica no service, na etapa da API.
export function findByTokenHash(token_hash: string) {
  return prisma.sessao.findUnique({
    where: { token_hash },
    omit: semHashDoToken,
    include: { usuario: usuarioMinimo },
  });
}


// Registra o último uso da sessão. Devolve quantas sessões foram atualizadas.
export function touch(id: number, quando: Date) {
  return prisma.sessao.updateMany({
    where: { id },
    data: { ultimo_uso_em: quando },
  });
}


// Revoga a sessão. Se já estava revogada, não altera nada (count = 0).
export function revoke(id: number, quando: Date) {
  return prisma.sessao.updateMany({
    where: { id, revogada_em: null },
    data: { revogada_em: quando },
  });
}


// Revoga todas as sessões ainda não revogadas do usuário.
export function revokeAllByUsuario(usuarioId: number, quando: Date) {
  return prisma.sessao.updateMany({
    where: { usuario_id: usuarioId, revogada_em: null },
    data: { revogada_em: quando },
  });
}


// "Expirada" = expira_em estritamente anterior a "antes".
// O usuarioId opcional limita o alcance (os testes SEMPRE o informam).
export function countExpiradas(antes: Date, usuarioId?: number) {
  return prisma.sessao.count({
    where: {
      expira_em: { lt: antes },
      ...(usuarioId === undefined ? {} : { usuario_id: usuarioId }),
    },
  });
}


// Exclui as sessões expiradas antes de uma data. Devolve quantas foram
// excluídas. Sem usuarioId, vale para toda a tabela (uso da limpeza real,
// na etapa da API); com usuarioId, só para as sessões daquele usuário.
export function deleteExpiradas(antes: Date, usuarioId?: number) {
  return prisma.sessao.deleteMany({
    where: {
      expira_em: { lt: antes },
      ...(usuarioId === undefined ? {} : { usuario_id: usuarioId }),
    },
  });
}
