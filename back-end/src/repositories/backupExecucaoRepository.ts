import { prisma } from "../database/client.ts";

import {
  OrigemBackup,
  SituacaoBackup,
} from "../../generated/prisma/client.ts";

import type { CreateBackupExecucaoDto }
  from "../dto/backup/createBackupExecucaoDto.ts";
import type { ConcluirBackupDto }
  from "../dto/backup/concluirBackupDto.ts";
import type { FalharBackupDto }
  from "../dto/backup/falharBackupDto.ts";


const include = {
  solicitado_por: {
    select: { id: true, nome: true },
  },
};


function buscar(id: number) {
  return prisma.backupExecucao.findUnique({
    where: { id },
    include,
  });
}


export type BackupExecucaoCompleto = NonNullable<Awaited<ReturnType<typeof buscar>>>;


export type ResultadoDeIniciar =
  | { situacao: "ok"; execucao: BackupExecucaoCompleto }
  | { situacao: "em_andamento"; execucao: BackupExecucaoCompleto | null }
  | { situacao: "ja_agendado_no_dia" };


export type ResultadoDaFinalizacao =
  | { situacao: "ok"; execucao: BackupExecucaoCompleto }
  | { situacao: "nao_encontrada" }
  | { situacao: "nao_em_andamento" }
  | { situacao: "arquivo_duplicado" };


export type ResultadoDaRemocao =
  | { situacao: "ok" }
  | { situacao: "nao_encontrada" }
  | { situacao: "nao_concluida" }
  | { situacao: "ja_removido" };


export type ResultadoDoVisto =
  | { situacao: "ok"; execucao: BackupExecucaoCompleto }
  | { situacao: "nao_encontrada" }
  | { situacao: "sem_aviso" }
  | { situacao: "ja_visto" };


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


export function findById(id: number) {
  return buscar(id);
}


export function findRecentes(limite: number) {
  return prisma.backupExecucao.findMany({
    include,
    orderBy: [
      { iniciado_em: "desc" },
      { id: "desc" },
    ],
    take: limite,
  });
}


export function findEmAndamento() {
  return prisma.backupExecucao.findFirst({
    where: { situacao: SituacaoBackup.EM_ANDAMENTO },
    include,
  });
}


export function findAgendadoDoDia(data_referencia: Date) {
  return prisma.backupExecucao.findFirst({
    where: {
      origem: OrigemBackup.AGENDADO,
      data_referencia,
      situacao: {
        in: [SituacaoBackup.EM_ANDAMENTO, SituacaoBackup.CONCLUIDO],
      },
    },
    include,
  });
}


export function findConcluidosComArquivoAtivo() {
  return prisma.backupExecucao.findMany({
    where: {
      situacao: SituacaoBackup.CONCLUIDO,
      arquivo_removido_em: null,
    },
    select: { id: true, arquivo: true, finalizado_em: true },
    orderBy: [
      { finalizado_em: "desc" },
      { id: "desc" },
    ],
  });
}


export function findConcluidosAlemDosMaisRecentes(manter: number) {
  return prisma.backupExecucao.findMany({
    where: {
      situacao: SituacaoBackup.CONCLUIDO,
      arquivo_removido_em: null,
    },
    select: { id: true, arquivo: true },
    orderBy: [
      { finalizado_em: "desc" },
      { id: "desc" },
    ],
    skip: manter,
  });
}


export function findAvisosPendentes() {
  return prisma.backupExecucao.findMany({
    where: {
      situacao: SituacaoBackup.FALHOU,
      aviso_visto_em: null,
    },
    include,
    orderBy: [
      { finalizado_em: "desc" },
      { id: "desc" },
    ],
  });
}


export async function iniciar(
  data: CreateBackupExecucaoDto
): Promise<ResultadoDeIniciar> {
  const agora = new Date();

  try {
    const execucao = await prisma.backupExecucao.create({
      data: {
        origem: data.origem,
        data_referencia: data.data_referencia ?? null,
        solicitado_por_id: data.solicitado_por_id ?? null,
        iniciado_em: agora,
        ultimo_sinal_em: agora,
      },
      include,
    });

    return { situacao: "ok", execucao };
  }
  catch (erro) {
    if (!violouUnicidade(erro)) {
      throw erro;
    }

    const emAndamento = await findEmAndamento();

    if (emAndamento) {
      return { situacao: "em_andamento", execucao: emAndamento };
    }

    if (data.origem === OrigemBackup.AGENDADO) {
      return { situacao: "ja_agendado_no_dia" };
    }

    return { situacao: "em_andamento", execucao: null };
  }
}


export async function sinalDeVida(id: number): Promise<boolean> {
  const { count } = await prisma.backupExecucao.updateMany({
    where: { id, situacao: SituacaoBackup.EM_ANDAMENTO },
    data: { ultimo_sinal_em: new Date() },
  });

  return count === 1;
}


async function situacaoDeQuemNaoMudou(id: number) {
  const atual = await prisma.backupExecucao.findUnique({
    where: { id },
    select: { id: true },
  });

  return atual
    ? ({ situacao: "nao_em_andamento" } as const)
    : ({ situacao: "nao_encontrada" } as const);
}


export async function concluir(
  id: number,
  dados: ConcluirBackupDto
): Promise<ResultadoDaFinalizacao> {
  try {
    const { count } = await prisma.backupExecucao.updateMany({
      where: { id, situacao: SituacaoBackup.EM_ANDAMENTO },
      data: {
        situacao: SituacaoBackup.CONCLUIDO,
        finalizado_em: new Date(),
        arquivo: dados.arquivo,
        tamanho_bytes: dados.tamanho_bytes,
        sha256: dados.sha256,
      },
    });

    if (count !== 1) {
      return await situacaoDeQuemNaoMudou(id);
    }
  }
  catch (erro) {
    if (violouUnicidade(erro)) {
      return { situacao: "arquivo_duplicado" };
    }

    throw erro;
  }

  const execucao = await buscar(id);

  return execucao
    ? { situacao: "ok", execucao }
    : { situacao: "nao_encontrada" };
}


export async function falhar(
  id: number,
  dados: FalharBackupDto
): Promise<ResultadoDaFinalizacao> {
  const erro = dados.erro.trim() || "Falha sem detalhe.";

  const { count } = await prisma.backupExecucao.updateMany({
    where: { id, situacao: SituacaoBackup.EM_ANDAMENTO },
    data: {
      situacao: SituacaoBackup.FALHOU,
      finalizado_em: new Date(),
      erro,
    },
  });

  if (count !== 1) {
    return situacaoDeQuemNaoMudou(id);
  }

  const execucao = await buscar(id);

  return execucao
    ? { situacao: "ok", execucao }
    : { situacao: "nao_encontrada" };
}


export async function marcarSemSinal(
  semSinalAntesDe: Date,
  erro: string
): Promise<number> {
  const texto = erro.trim() || "Falha sem detalhe.";

  const { count } = await prisma.backupExecucao.updateMany({
    where: {
      situacao: SituacaoBackup.EM_ANDAMENTO,
      ultimo_sinal_em: { lt: semSinalAntesDe },
    },
    data: {
      situacao: SituacaoBackup.FALHOU,
      finalizado_em: new Date(),
      erro: texto,
    },
  });

  return count;
}


export async function marcarArquivoRemovido(
  id: number
): Promise<ResultadoDaRemocao> {
  const { count } = await prisma.backupExecucao.updateMany({
    where: {
      id,
      situacao: SituacaoBackup.CONCLUIDO,
      arquivo_removido_em: null,
    },
    data: { arquivo_removido_em: new Date() },
  });

  if (count === 1) {
    return { situacao: "ok" };
  }

  const atual = await prisma.backupExecucao.findUnique({
    where: { id },
    select: { situacao: true },
  });

  if (!atual) {
    return { situacao: "nao_encontrada" };
  }

  if (atual.situacao !== SituacaoBackup.CONCLUIDO) {
    return { situacao: "nao_concluida" };
  }

  return { situacao: "ja_removido" };
}


export async function marcarVisto(
  id: number,
  usuarioId: number
): Promise<ResultadoDoVisto> {
  const { count } = await prisma.backupExecucao.updateMany({
    where: {
      id,
      situacao: SituacaoBackup.FALHOU,
      aviso_visto_em: null,
    },
    data: {
      aviso_visto_em: new Date(),
      aviso_visto_por_id: usuarioId,
    },
  });

  if (count === 1) {
    const execucao = await buscar(id);

    return execucao
      ? { situacao: "ok", execucao }
      : { situacao: "nao_encontrada" };
  }

  const atual = await prisma.backupExecucao.findUnique({
    where: { id },
    select: { situacao: true, aviso_visto_em: true },
  });

  if (!atual) {
    return { situacao: "nao_encontrada" };
  }

  if (atual.situacao !== SituacaoBackup.FALHOU) {
    return { situacao: "sem_aviso" };
  }

  return { situacao: "ja_visto" };
}
