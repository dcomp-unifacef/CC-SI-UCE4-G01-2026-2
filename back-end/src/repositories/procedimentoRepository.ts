import { prisma } from "../database/client.ts";

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


export async function atualizar(
  id: number,
  data: UpdateProcedimentoDto
): Promise<ResultadoDoProcedimento> {
  try {
    const procedimento = await prisma.procedimento.update({
      where: { id },
      data,
    });

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
