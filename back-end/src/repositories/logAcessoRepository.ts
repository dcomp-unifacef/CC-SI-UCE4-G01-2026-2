import { prisma } from "../database/client.ts";

import type { TipoAcessoPaciente } from "../../generated/prisma/client.ts";

import type { CreateLogAcessoDto }
  from "../dto/logAcesso/createLogAcessoDto.ts";

import type { FiltroLogAcessoDto }
  from "../dto/logAcesso/filtroLogAcessoDto.ts";


const TAMANHO_DO_LOTE = 5000;

const OPCOES_TRANSACAO = { maxWait: 10_000, timeout: 30_000 };

const pessoaMinima = { select: { id: true, nome: true } };


export function registrar(data: CreateLogAcessoDto) {
  return prisma.logAcesso.create({ data });
}


export async function registrarLote(
  usuario_id: number,
  tipo: TipoAcessoPaciente,
  pacienteIds: number[]
): Promise<number> {
  const ids = [...new Set(pacienteIds)];

  if (ids.length === 0) {
    return 0;
  }

  const partes: number[][] = [];

  for (let i = 0; i < ids.length; i += TAMANHO_DO_LOTE) {
    partes.push(ids.slice(i, i + TAMANHO_DO_LOTE));
  }

  const linhas = (parte: number[]) =>
    parte.map((paciente_id) => ({ usuario_id, paciente_id, tipo }));

  if (partes.length === 1) {
    const { count } = await prisma.logAcesso.createMany({
      data: linhas(partes[0]!),
    });

    return count;
  }

  return prisma.$transaction(async (tx) => {
    let total = 0;

    for (const parte of partes) {
      const { count } = await tx.logAcesso.createMany({ data: linhas(parte) });

      total += count;
    }

    return total;
  }, OPCOES_TRANSACAO);
}


export function findAll(filtro: FiltroLogAcessoDto) {
  return prisma.logAcesso.findMany({
    where: {
      ...(filtro.paciente_id !== undefined
        ? { paciente_id: filtro.paciente_id }
        : {}),
      ...(filtro.usuario_id !== undefined
        ? { usuario_id: filtro.usuario_id }
        : {}),
      ...(filtro.tipo !== undefined ? { tipo: filtro.tipo } : {}),
      ...(filtro.de !== undefined || filtro.ate !== undefined
        ? {
            acessado_em: {
              ...(filtro.de !== undefined ? { gte: filtro.de } : {}),
              ...(filtro.ate !== undefined ? { lte: filtro.ate } : {}),
            },
          }
        : {}),
      ...(filtro.antes_do_id !== undefined
        ? { id: { lt: filtro.antes_do_id } }
        : {}),
    },
    include: { usuario: pessoaMinima, paciente: pessoaMinima },
    orderBy: [{ id: "desc" }],
    take: filtro.limite,
  });
}


export function countByPaciente(paciente_id: number) {
  return prisma.logAcesso.count({
    where: { paciente_id },
  });
}


export function countByUsuario(usuario_id: number) {
  return prisma.logAcesso.count({
    where: { usuario_id },
  });
}
