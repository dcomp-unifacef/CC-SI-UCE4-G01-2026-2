import { prisma } from "../database/client.ts";
import { BLOQUEIO_CONSENTIMENTO } from "../database/bloqueios.ts";

import { AcaoConsentimento } from "../../generated/prisma/client.ts";

import type { CreateConsentimentoDto }
  from "../dto/consentimento/createConsentimentoDto.ts";


const TAMANHO_DA_PARTE = 1000;

const OPCOES_TRANSACAO = { maxWait: 10_000, timeout: 20_000 };

const usuarioMinimo = { select: { id: true, nome: true } };

const include = { registrado_por: usuarioMinimo };

const maisRecentePrimeiro = [{ id: "desc" as const }];


function buscarUltimo(paciente_id: number) {
  return prisma.consentimentoPaciente.findFirst({
    where: { paciente_id },
    include,
    orderBy: maisRecentePrimeiro,
  });
}


export type ConsentimentoRegistrado = NonNullable<
  Awaited<ReturnType<typeof buscarUltimo>>
>;


export type SituacaoConsentimento = "SEM_REGISTRO" | "CONCEDIDO" | "REVOGADO";


export type ResultadoDoConsentimento =
  | { situacao: "ok"; registro: ConsentimentoRegistrado }
  | { situacao: "paciente_nao_encontrado" }
  | { situacao: "ja_concedido" }
  | { situacao: "nao_concedido" };


function violouChaveEstrangeira(erro: unknown): boolean {
  const e = erro as {
    code?: string;
    meta?: { driverAdapterError?: { cause?: { originalCode?: string } } };
  };

  return (
    e.code === "P2003" ||
    e.meta?.driverAdapterError?.cause?.originalCode === "23503"
  );
}


export function situacaoDoConsentimento(
  ultimo: { acao: AcaoConsentimento } | null | undefined
): SituacaoConsentimento {
  if (!ultimo) {
    return "SEM_REGISTRO";
  }

  return ultimo.acao === AcaoConsentimento.CONCESSAO
    ? "CONCEDIDO"
    : "REVOGADO";
}


export function findUltimo(paciente_id: number) {
  return buscarUltimo(paciente_id);
}


export function findHistorico(paciente_id: number) {
  return prisma.consentimentoPaciente.findMany({
    where: { paciente_id },
    include,
    orderBy: maisRecentePrimeiro,
  });
}


export async function findUltimosPorPacientes(
  ids: number[]
): Promise<Map<number, ConsentimentoRegistrado>> {
  const unicos = [...new Set(ids)];
  const ultimos = new Map<number, ConsentimentoRegistrado>();

  for (let i = 0; i < unicos.length; i += TAMANHO_DA_PARTE) {
    const parte = unicos.slice(i, i + TAMANHO_DA_PARTE);

    const registros = await prisma.consentimentoPaciente.findMany({
      where: { paciente_id: { in: parte } },
      include,
      orderBy: [{ paciente_id: "asc" }, { id: "desc" }],
      distinct: ["paciente_id"],
    });

    for (const registro of registros) {
      ultimos.set(registro.paciente_id, registro);
    }
  }

  return ultimos;
}


export function countByPaciente(paciente_id: number) {
  return prisma.consentimentoPaciente.count({
    where: { paciente_id },
  });
}


export async function registrar(
  data: CreateConsentimentoDto,
  usuarioId: number
): Promise<ResultadoDoConsentimento> {
  try {
    return await prisma.$transaction(
      async (tx): Promise<ResultadoDoConsentimento> => {
        await tx.$queryRaw`SELECT 1 AS bloqueado FROM (SELECT pg_advisory_xact_lock(${BLOQUEIO_CONSENTIMENTO}::int, ${data.paciente_id}::int)) AS trava`;

        const paciente = await tx.paciente.findUnique({
          where: { id: data.paciente_id },
          select: { id: true },
        });

        if (!paciente) {
          return { situacao: "paciente_nao_encontrado" };
        }

        const ultimo = await tx.consentimentoPaciente.findFirst({
          where: { paciente_id: data.paciente_id },
          select: { acao: true },
          orderBy: maisRecentePrimeiro,
        });

        const concedido = situacaoDoConsentimento(ultimo) === "CONCEDIDO";

        if (data.acao === AcaoConsentimento.CONCESSAO && concedido) {
          return { situacao: "ja_concedido" };
        }

        if (data.acao === AcaoConsentimento.REVOGACAO && !concedido) {
          return { situacao: "nao_concedido" };
        }

        const registro = await tx.consentimentoPaciente.create({
          data: {
            paciente_id: data.paciente_id,
            acao: data.acao,
            termo: data.termo,
            registrado_por_id: usuarioId,
            registrado_em: new Date(),
          },
          include,
        });

        return { situacao: "ok", registro };
      },
      OPCOES_TRANSACAO
    );
  }
  catch (erro) {
    if (violouChaveEstrangeira(erro)) {
      return { situacao: "paciente_nao_encontrado" };
    }

    throw erro;
  }
}
