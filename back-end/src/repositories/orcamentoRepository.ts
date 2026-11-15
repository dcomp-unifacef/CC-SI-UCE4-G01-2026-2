import { prisma } from "../database/client.ts";

import {
  SituacaoOrcamento,
  TipoHistoricoOrcamento,
} from "../../generated/prisma/client.ts";

import type { Prisma } from "../../generated/prisma/client.ts";

import type { CreateOrcamentoDto }
  from "../dto/orcamento/createOrcamentoDto.ts";

import type { ItemOrcamentoEntradaDto }
  from "../dto/orcamento/itemOrcamentoEntradaDto.ts";

import type { AlteracaoCabecalhoOrcamentoDto }
  from "../dto/orcamento/alteracaoCabecalhoOrcamentoDto.ts";

import type { DecisaoOrcamentoDto }
  from "../dto/orcamento/decisaoOrcamentoDto.ts";

import type { CorrecaoDecisaoOrcamentoDto }
  from "../dto/orcamento/correcaoDecisaoOrcamentoDto.ts";

import type { ReaberturaOrcamentoDto }
  from "../dto/orcamento/reaberturaOrcamentoDto.ts";


export const LIMITE_TOTAL_CENTAVOS = 2_000_000_000;

export const LIMITE_ITENS = 50;

const OPCOES_TRANSACAO = { maxWait: 10_000, timeout: 20_000 };


const usuarioMinimo = { select: { id: true, nome: true } };

const include = {
  paciente: { select: { id: true, nome: true, telefone: true } },
  dentista: usuarioMinimo,
  criado_por: usuarioMinimo,
  decidido_por: usuarioMinimo,
  itens: { orderBy: { id: "asc" as const } },
};

const includeResumo = {
  paciente: { select: { id: true, nome: true, telefone: true } },
  dentista: usuarioMinimo,
  criado_por: usuarioMinimo,
  decidido_por: usuarioMinimo,
  _count: { select: { itens: true } },
};


function buscar(id: number) {
  return prisma.orcamento.findUnique({
    where: { id },
    include,
  });
}


export type OrcamentoCompleto = NonNullable<
  Awaited<ReturnType<typeof buscar>>
>;


export type OrcamentoResumo = Awaited<
  ReturnType<typeof findByPaciente>
>[number];


export type HistoricoDoOrcamento = Awaited<
  ReturnType<typeof findHistorico>
>[number];


export type ResultadoDoOrcamento =
  | { situacao: "ok"; orcamento: OrcamentoCompleto }
  | { situacao: "nao_encontrado" }
  | { situacao: "paciente_nao_encontrado" }
  | { situacao: "paciente_inativo" }
  | { situacao: "dentista_nao_encontrado" }
  | { situacao: "dentista_inativo" }
  | { situacao: "procedimento_nao_encontrado" }
  | { situacao: "procedimento_inativo" }
  | { situacao: "item_nao_encontrado" }
  | { situacao: "nao_pendente" }
  | { situacao: "nao_decidido" }
  | { situacao: "sem_mudanca" }
  | { situacao: "total_excedido" }
  | { situacao: "limite_itens" }
  | { situacao: "sem_itens" }
  | { situacao: "alterada_por_outra_operacao" };


type Falha = Exclude<ResultadoDoOrcamento, { situacao: "ok" }>;

type Transacao = Prisma.TransactionClient;

type ItemMontado = {
  procedimento_id: number;
  nome_procedimento: string;
  valor_unitario_centavos: number;
  quantidade: number;
};


class Desfazer extends Error {
  resultado: Falha;

  constructor(resultado: Falha) {
    super("transação desfeita");
    this.resultado = resultado;
  }
}


async function emTransacao(
  operacao: (tx: Transacao) => Promise<ResultadoDoOrcamento>
): Promise<ResultadoDoOrcamento> {
  try {
    return await prisma.$transaction(async (tx) => {
      const resultado = await operacao(tx);

      if (resultado.situacao !== "ok") {
        throw new Desfazer(resultado);
      }

      return resultado;
    }, OPCOES_TRANSACAO);
  }
  catch (erro) {
    if (erro instanceof Desfazer) {
      return erro.resultado;
    }

    throw erro;
  }
}


function soData(data: Date): Date {
  return new Date(Date.UTC(
    data.getUTCFullYear(),
    data.getUTCMonth(),
    data.getUTCDate()
  ));
}


function somar(
  itens: { valor_unitario_centavos: number; quantidade: number }[]
): number | null {
  let total = 0;

  for (const item of itens) {
    const subtotal = item.valor_unitario_centavos * item.quantidade;

    if (subtotal > LIMITE_TOTAL_CENTAVOS) {
      return null;
    }

    total += subtotal;

    if (total > LIMITE_TOTAL_CENTAVOS) {
      return null;
    }
  }

  return total;
}


async function validarPaciente(
  tx: Transacao,
  id: number
): Promise<Falha | null> {
  const paciente = await tx.paciente.findUnique({
    where: { id },
    select: { ativo: true },
  });

  if (!paciente) {
    return { situacao: "paciente_nao_encontrado" };
  }

  const trava = await tx.paciente.updateMany({
    where: { id, ativo: true },
    data: { ativo: true },
  });

  if (trava.count !== 1) {
    return { situacao: "paciente_inativo" };
  }

  return null;
}


async function travarPacienteAtivo(
  tx: Transacao,
  orcamentoId: number
): Promise<Falha | null> {
  const trava = await tx.paciente.updateMany({
    where: { ativo: true, orcamentos: { some: { id: orcamentoId } } },
    data: { ativo: true },
  });

  if (trava.count === 1) {
    return null;
  }

  const existe = await tx.orcamento.findUnique({
    where: { id: orcamentoId },
    select: { id: true },
  });

  return existe
    ? { situacao: "paciente_inativo" }
    : { situacao: "nao_encontrado" };
}


async function validarDentista(
  tx: Transacao,
  id: number
): Promise<Falha | null> {
  const dentista = await tx.dentista.findUnique({
    where: { id },
    select: { ativo: true },
  });

  if (!dentista) {
    return { situacao: "dentista_nao_encontrado" };
  }

  const trava = await tx.dentista.updateMany({
    where: { id, ativo: true },
    data: { ativo: true },
  });

  if (trava.count !== 1) {
    return { situacao: "dentista_inativo" };
  }

  return null;
}


async function montarItens(
  tx: Transacao,
  entradas: ItemOrcamentoEntradaDto[]
): Promise<{ falha: Falha } | { itens: ItemMontado[] }> {
  const ids = [...new Set(entradas.map((entrada) => entrada.procedimento_id))];

  const procedimentos = await tx.procedimento.findMany({
    where: { id: { in: ids } },
  });

  const porId = new Map(procedimentos.map((p) => [p.id, p]));
  const itens: ItemMontado[] = [];

  for (const entrada of entradas) {
    const procedimento = porId.get(entrada.procedimento_id);

    if (!procedimento) {
      return { falha: { situacao: "procedimento_nao_encontrado" } };
    }

    if (!procedimento.ativo) {
      return { falha: { situacao: "procedimento_inativo" } };
    }

    itens.push({
      procedimento_id: procedimento.id,
      nome_procedimento: procedimento.nome,
      valor_unitario_centavos: procedimento.valor_centavos,
      quantidade: entrada.quantidade,
    });
  }

  return { itens };
}


async function travarPendente(
  tx: Transacao,
  id: number
): Promise<Falha | null> {
  const { count } = await tx.orcamento.updateMany({
    where: { id, situacao: SituacaoOrcamento.PENDENTE },
    data: { atualizado_em: new Date() },
  });

  if (count === 1) {
    return null;
  }

  const existe = await tx.orcamento.findUnique({
    where: { id },
    select: { id: true },
  });

  return existe
    ? { situacao: "nao_pendente" }
    : { situacao: "nao_encontrado" };
}


async function registrarAlteracao(
  tx: Transacao,
  id: number,
  usuarioId: number,
  totalAnterior: number,
  totalNovo: number
): Promise<void> {
  await tx.orcamento.update({
    where: { id },
    data: { total_centavos: totalNovo },
  });

  await tx.historicoOrcamento.create({
    data: {
      orcamento_id: id,
      tipo: TipoHistoricoOrcamento.ALTERACAO,
      situacao_anterior: SituacaoOrcamento.PENDENTE,
      situacao_nova: SituacaoOrcamento.PENDENTE,
      total_anterior_centavos: totalAnterior,
      total_novo_centavos: totalNovo,
      usuario_id: usuarioId,
    },
  });
}


async function concluir(
  tx: Transacao,
  id: number
): Promise<ResultadoDoOrcamento> {
  const orcamento = await tx.orcamento.findUniqueOrThrow({
    where: { id },
    include,
  });

  return { situacao: "ok", orcamento };
}


export function findById(id: number) {
  return buscar(id);
}


export function findByPaciente(
  paciente_id: number,
  situacao?: SituacaoOrcamento
) {
  return prisma.orcamento.findMany({
    where: situacao ? { paciente_id, situacao } : { paciente_id },
    include: includeResumo,
    orderBy: [
      { criado_em: "desc" },
      { id: "desc" },
    ],
  });
}


export function findHistorico(orcamento_id: number) {
  return prisma.historicoOrcamento.findMany({
    where: { orcamento_id },
    include: { usuario: usuarioMinimo },
    orderBy: [{ id: "asc" }],
  });
}


export function countByPaciente(paciente_id: number) {
  return prisma.orcamento.count({
    where: { paciente_id },
  });
}


export function countByDentista(dentista_id: number) {
  return prisma.orcamento.count({
    where: { dentista_id },
  });
}


export function criar(
  data: CreateOrcamentoDto,
  usuarioId: number
): Promise<ResultadoDoOrcamento> {
  return emTransacao(async (tx) => {
    if (data.itens.length > LIMITE_ITENS) {
      return { situacao: "limite_itens" };
    }

    const paciente = await validarPaciente(tx, data.paciente_id);

    if (paciente) {
      return paciente;
    }

    if (data.dentista_id !== undefined && data.dentista_id !== null) {
      const dentista = await validarDentista(tx, data.dentista_id);

      if (dentista) {
        return dentista;
      }
    }

    const montados = await montarItens(tx, data.itens);

    if ("falha" in montados) {
      return montados.falha;
    }

    const total = somar(montados.itens);

    if (total === null) {
      return { situacao: "total_excedido" };
    }

    const orcamento = await tx.orcamento.create({
      data: {
        paciente_id: data.paciente_id,
        dentista_id: data.dentista_id ?? null,
        valido_ate: data.valido_ate ? soData(data.valido_ate) : null,
        total_centavos: total,
        criado_por_id: usuarioId,
      },
    });

    if (montados.itens.length > 0) {
      await tx.itemOrcamento.createMany({
        data: montados.itens.map((item) => ({
          ...item,
          orcamento_id: orcamento.id,
        })),
      });
    }

    await tx.historicoOrcamento.create({
      data: {
        orcamento_id: orcamento.id,
        tipo: TipoHistoricoOrcamento.CRIACAO,
        situacao_nova: SituacaoOrcamento.PENDENTE,
        total_novo_centavos: total,
        usuario_id: usuarioId,
      },
    });

    return concluir(tx, orcamento.id);
  });
}


export function atualizarCabecalho(
  id: number,
  alteracao: AlteracaoCabecalhoOrcamentoDto,
  usuarioId: number
): Promise<ResultadoDoOrcamento> {
  return emTransacao(async (tx) => {
    const paciente = await travarPacienteAtivo(tx, id);

    if (paciente) {
      return paciente;
    }

    const atual = await tx.orcamento.findUnique({
      where: { id },
      select: {
        situacao: true,
        dentista_id: true,
        valido_ate: true,
        total_centavos: true,
      },
    });

    if (!atual) {
      return { situacao: "nao_encontrado" };
    }

    if (atual.situacao !== SituacaoOrcamento.PENDENTE) {
      return { situacao: "nao_pendente" };
    }

    const dentistaNovo = alteracao.dentista_id === undefined
      ? atual.dentista_id
      : alteracao.dentista_id;

    const validadeNova = alteracao.valido_ate === undefined
      ? atual.valido_ate
      : alteracao.valido_ate === null
        ? null
        : soData(alteracao.valido_ate);

    const dentistaMudou = dentistaNovo !== atual.dentista_id;

    const validadeMudou =
      (validadeNova?.getTime() ?? null) !== (atual.valido_ate?.getTime() ?? null);

    if (!dentistaMudou && !validadeMudou) {
      return { situacao: "sem_mudanca" };
    }

    if (dentistaMudou && dentistaNovo !== null) {
      const dentista = await validarDentista(tx, dentistaNovo);

      if (dentista) {
        return dentista;
      }
    }

    const { count } = await tx.orcamento.updateMany({
      where: {
        id,
        situacao: SituacaoOrcamento.PENDENTE,
        dentista_id: atual.dentista_id,
        valido_ate: atual.valido_ate,
      },
      data: { dentista_id: dentistaNovo, valido_ate: validadeNova },
    });

    if (count !== 1) {
      return { situacao: "alterada_por_outra_operacao" };
    }

    await tx.historicoOrcamento.create({
      data: {
        orcamento_id: id,
        tipo: TipoHistoricoOrcamento.ALTERACAO,
        situacao_anterior: SituacaoOrcamento.PENDENTE,
        situacao_nova: SituacaoOrcamento.PENDENTE,
        total_anterior_centavos: atual.total_centavos,
        total_novo_centavos: atual.total_centavos,
        usuario_id: usuarioId,
      },
    });

    return concluir(tx, id);
  });
}


export function adicionarItem(
  id: number,
  entrada: ItemOrcamentoEntradaDto,
  usuarioId: number
): Promise<ResultadoDoOrcamento> {
  return emTransacao(async (tx) => {
    const paciente = await travarPacienteAtivo(tx, id);

    if (paciente) {
      return paciente;
    }

    const trava = await travarPendente(tx, id);

    if (trava) {
      return trava;
    }

    const montados = await montarItens(tx, [entrada]);

    if ("falha" in montados) {
      return montados.falha;
    }

    const atuais = await tx.itemOrcamento.findMany({
      where: { orcamento_id: id },
      select: { valor_unitario_centavos: true, quantidade: true },
    });

    if (atuais.length >= LIMITE_ITENS) {
      return { situacao: "limite_itens" };
    }

    const totalAnterior = somar(atuais);
    const totalNovo = somar([...atuais, ...montados.itens]);

    if (totalAnterior === null || totalNovo === null) {
      return { situacao: "total_excedido" };
    }

    await tx.itemOrcamento.create({
      data: { ...montados.itens[0]!, orcamento_id: id },
    });

    await registrarAlteracao(tx, id, usuarioId, totalAnterior, totalNovo);

    return concluir(tx, id);
  });
}


export function alterarQuantidadeDoItem(
  id: number,
  itemId: number,
  quantidade: number,
  usuarioId: number
): Promise<ResultadoDoOrcamento> {
  return emTransacao(async (tx) => {
    const paciente = await travarPacienteAtivo(tx, id);

    if (paciente) {
      return paciente;
    }

    const trava = await travarPendente(tx, id);

    if (trava) {
      return trava;
    }

    const atuais = await tx.itemOrcamento.findMany({
      where: { orcamento_id: id },
      orderBy: { id: "asc" },
      select: { id: true, valor_unitario_centavos: true, quantidade: true },
    });

    const item = atuais.find((atual) => atual.id === itemId);

    if (!item) {
      return { situacao: "item_nao_encontrado" };
    }

    if (item.quantidade === quantidade) {
      return { situacao: "sem_mudanca" };
    }

    const totalAnterior = somar(atuais);

    const totalNovo = somar(
      atuais.map((atual) =>
        atual.id === itemId ? { ...atual, quantidade } : atual
      )
    );

    if (totalAnterior === null || totalNovo === null) {
      return { situacao: "total_excedido" };
    }

    await tx.itemOrcamento.update({
      where: { id: itemId },
      data: { quantidade },
    });

    await registrarAlteracao(tx, id, usuarioId, totalAnterior, totalNovo);

    return concluir(tx, id);
  });
}


export function removerItem(
  id: number,
  itemId: number,
  usuarioId: number
): Promise<ResultadoDoOrcamento> {
  return emTransacao(async (tx) => {
    const paciente = await travarPacienteAtivo(tx, id);

    if (paciente) {
      return paciente;
    }

    const trava = await travarPendente(tx, id);

    if (trava) {
      return trava;
    }

    const atuais = await tx.itemOrcamento.findMany({
      where: { orcamento_id: id },
      select: { id: true, valor_unitario_centavos: true, quantidade: true },
    });

    if (!atuais.some((atual) => atual.id === itemId)) {
      return { situacao: "item_nao_encontrado" };
    }

    const totalAnterior = somar(atuais);
    const totalNovo = somar(atuais.filter((atual) => atual.id !== itemId));

    if (totalAnterior === null || totalNovo === null) {
      return { situacao: "total_excedido" };
    }

    await tx.itemOrcamento.delete({ where: { id: itemId } });

    await registrarAlteracao(tx, id, usuarioId, totalAnterior, totalNovo);

    return concluir(tx, id);
  });
}


export function decidir(
  id: number,
  dados: DecisaoOrcamentoDto,
  usuarioId: number
): Promise<ResultadoDoOrcamento> {
  return emTransacao(async (tx) => {
    const paciente = await travarPacienteAtivo(tx, id);

    if (paciente) {
      return paciente;
    }

    const atual = await tx.orcamento.findUnique({
      where: { id },
      select: { situacao: true },
    });

    if (!atual) {
      return { situacao: "nao_encontrado" };
    }

    if (atual.situacao !== SituacaoOrcamento.PENDENTE) {
      return { situacao: "nao_pendente" };
    }

    const { count } = await tx.orcamento.updateMany({
      where: { id, situacao: SituacaoOrcamento.PENDENTE },
      data: {
        situacao: dados.situacao,
        decidido_em: new Date(),
        decidido_por_id: usuarioId,
      },
    });

    if (count !== 1) {
      return { situacao: "alterada_por_outra_operacao" };
    }

    const quantidadeDeItens = await tx.itemOrcamento.count({
      where: { orcamento_id: id },
    });

    if (quantidadeDeItens === 0) {
      return { situacao: "sem_itens" };
    }

    await tx.historicoOrcamento.create({
      data: {
        orcamento_id: id,
        tipo: TipoHistoricoOrcamento.DECISAO,
        situacao_anterior: SituacaoOrcamento.PENDENTE,
        situacao_nova: dados.situacao,
        motivo: dados.motivo ?? null,
        usuario_id: usuarioId,
      },
    });

    return concluir(tx, id);
  });
}


export function corrigirDecisao(
  id: number,
  dados: CorrecaoDecisaoOrcamentoDto,
  usuarioId: number
): Promise<ResultadoDoOrcamento> {
  return emTransacao(async (tx) => {
    const paciente = await travarPacienteAtivo(tx, id);

    if (paciente) {
      return paciente;
    }

    const atual = await tx.orcamento.findUnique({
      where: { id },
      select: { situacao: true },
    });

    if (!atual) {
      return { situacao: "nao_encontrado" };
    }

    if (atual.situacao === SituacaoOrcamento.PENDENTE) {
      return { situacao: "nao_decidido" };
    }

    if (atual.situacao === dados.situacao) {
      return { situacao: "sem_mudanca" };
    }

    const { count } = await tx.orcamento.updateMany({
      where: { id, situacao: atual.situacao },
      data: {
        situacao: dados.situacao,
        decidido_em: new Date(),
        decidido_por_id: usuarioId,
      },
    });

    if (count !== 1) {
      return { situacao: "alterada_por_outra_operacao" };
    }

    await tx.historicoOrcamento.create({
      data: {
        orcamento_id: id,
        tipo: TipoHistoricoOrcamento.CORRECAO,
        situacao_anterior: atual.situacao,
        situacao_nova: dados.situacao,
        motivo: dados.motivo,
        usuario_id: usuarioId,
      },
    });

    return concluir(tx, id);
  });
}


export function reabrir(
  id: number,
  dados: ReaberturaOrcamentoDto,
  usuarioId: number
): Promise<ResultadoDoOrcamento> {
  return emTransacao(async (tx) => {
    const paciente = await travarPacienteAtivo(tx, id);

    if (paciente) {
      return paciente;
    }

    const atual = await tx.orcamento.findUnique({
      where: { id },
      select: { situacao: true },
    });

    if (!atual) {
      return { situacao: "nao_encontrado" };
    }

    if (atual.situacao === SituacaoOrcamento.PENDENTE) {
      return { situacao: "nao_decidido" };
    }

    const { count } = await tx.orcamento.updateMany({
      where: { id, situacao: atual.situacao },
      data: {
        situacao: SituacaoOrcamento.PENDENTE,
        decidido_em: null,
        decidido_por_id: null,
      },
    });

    if (count !== 1) {
      return { situacao: "alterada_por_outra_operacao" };
    }

    await tx.historicoOrcamento.create({
      data: {
        orcamento_id: id,
        tipo: TipoHistoricoOrcamento.REABERTURA,
        situacao_anterior: atual.situacao,
        situacao_nova: SituacaoOrcamento.PENDENTE,
        motivo: dados.motivo,
        usuario_id: usuarioId,
      },
    });

    return concluir(tx, id);
  });
}
