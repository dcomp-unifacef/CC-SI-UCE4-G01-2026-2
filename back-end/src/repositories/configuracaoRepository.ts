import { prisma } from "../database/client.ts";
import { BLOQUEIO_CONFIGURACAO } from "../database/bloqueios.ts";

import type { UpdateConfiguracaoDto }
  from "../dto/configuracao/updateConfiguracaoDto.ts";


const ID_UNICO = 1;

const MINUTO_EM_MS = 60 * 1000;


export function find() {
  return prisma.configuracao.findUnique({
    where: { id: ID_UNICO },
  });
}


export function update(data: UpdateConfiguracaoDto) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT 1 AS bloqueado FROM (SELECT pg_advisory_xact_lock(${BLOQUEIO_CONFIGURACAO}::bigint)) AS trava`;

      const anterior = await tx.configuracao.findUniqueOrThrow({
        where: { id: ID_UNICO },
      });

      const atualizada = await tx.configuracao.update({
        where: { id: ID_UNICO },
        data,
      });

      const agora = new Date();

      if (atualizada.sessao_inatividade_min !== anterior.sessao_inatividade_min) {
        await tx.sessao.updateMany({
          where: {
            revogada_em: null,
            expira_em: { gt: agora },
            ultimo_uso_em: {
              lt: new Date(
                agora.getTime() - anterior.sessao_inatividade_min * MINUTO_EM_MS
              ),
            },
          },
          data: { revogada_em: agora },
        });
      }

      if (atualizada.sessao_duracao_max_min < anterior.sessao_duracao_max_min) {
        const vivas = await tx.sessao.findMany({
          where: { revogada_em: null, expira_em: { gt: agora } },
          select: { id: true, criada_em: true, expira_em: true },
        });

        for (const sessao of vivas) {
          const teto = new Date(
            sessao.criada_em.getTime() +
              atualizada.sessao_duracao_max_min * MINUTO_EM_MS
          );

          if (teto.getTime() < sessao.expira_em.getTime()) {
            await tx.sessao.updateMany({
              where: {
                id: sessao.id,
                revogada_em: null,
                expira_em: sessao.expira_em,
              },
              data: { expira_em: teto },
            });
          }
        }
      }

      return atualizada;
    },
    { maxWait: 10_000, timeout: 30_000 }
  );
}
