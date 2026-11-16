import { prisma } from "../database/client.ts";
import { BLOQUEIO_PROCEDIMENTO } from "../database/bloqueios.ts";

import type { Prisma } from "../../generated/prisma/client.ts";

import type { CreateProcedimentoDto }
  from "../dto/procedimento/createProcedimentoDto.ts";

import type { UpdateProcedimentoDto }
  from "../dto/procedimento/updateProcedimentoDto.ts";


export type Procedimento = NonNullable<
  Awaited<ReturnType<typeof findById>>
>;


export type ResultadoDoProcedimento =
  | { situacao: "ok"; procedimento: Procedimento }
  | { situacao: "nao_encontrado" }
  | { situacao: "nome_em_uso" };


function violouUnicidade(erro: unknown): boolean {
  const e = erro as {
    code?: string;
    meta?: { driverAdapterError?: { cause?: { originalCode?: string } } };
  };

  return (
    e.code === "P2002" ||
    e.meta?.driverAdapterError?.cause?.originalCode === "23505"
  );
}


function naoEncontrado(erro: unknown): boolean {
  return (erro as { code?: string }).code === "P2025";
}


export function findAll(filtro: { ativo?: boolean } = {}) {
  return prisma.procedimento.findMany({
    where: filtro.ativo === undefined ? {} : { ativo: filtro.ativo },
    orderBy: [
      { nome: "asc" },
      { id: "asc" },
    ],
  });
}


export function findById(id: number) {
  return prisma.procedimento.findUnique({
    where: { id },
  });
}


export function findByNome(nome: string) {
  return prisma.procedimento.findFirst({
    where: { nome: { equals: nome, mode: "insensitive" } },
  });
}


export async function criar(
  data: CreateProcedimentoDto
): Promise<ResultadoDoProcedimento> {
  try {
    const procedimento = await prisma.procedimento.create({ data });

    return { situacao: "ok", procedimento };
  }
  catch (erro) {
    if (violouUnicidade(erro)) {
      return { situacao: "nome_em_uso" };
    }

    throw erro;
  }
}


export type SituacaoDoItemParaVinculo = "ok" | "inativo" | "inexistente";


export async function travarItemParaVinculo(
  tx: Prisma.TransactionClient,
  id: number
): Promise<SituacaoDoItemParaVinculo> {
  await tx.$queryRaw`SELECT 1 AS bloqueado FROM (SELECT pg_advisory_xact_lock(${BLOQUEIO_PROCEDIMENTO}::int, ${id}::int)) AS trava`;

  const item = await tx.procedimento.findUnique({
    where: { id },
    select: { ativo: true },
  });

  if (!item) {
    return "inexistente";
  }

  return item.ativo ? "ok" : "inativo";
}


export async function atualizar(
  id: number,
  data: UpdateProcedimentoDto
): Promise<ResultadoDoProcedimento> {
  try {
    const procedimento =
      data.ativo === undefined
        ? await prisma.procedimento.update({
            where: { id },
            data,
          })
        : await prisma.$transaction(
            async (tx) => {
              await tx.$queryRaw`SELECT 1 AS bloqueado FROM (SELECT pg_advisory_xact_lock(${BLOQUEIO_PROCEDIMENTO}::int, ${id}::int)) AS trava`;

              return tx.procedimento.update({
                where: { id },
                data,
              });
            },
            { maxWait: 10_000, timeout: 20_000 }
          );

    return { situacao: "ok", procedimento };
  }
  catch (erro) {
    if (naoEncontrado(erro)) {
      return { situacao: "nao_encontrado" };
    }

    if (violouUnicidade(erro)) {
      return { situacao: "nome_em_uso" };
    }

    throw erro;
  }
}
