import * as repository from "../repositories/orcamentoRepository.ts";
import * as pacienteRepository from "../repositories/pacienteRepository.ts";

import { Perfil, SituacaoOrcamento } from "../../generated/prisma/client.ts";

import type {
  HistoricoDoOrcamento,
  OrcamentoCompleto,
  OrcamentoResumo,
  ResultadoDoOrcamento,
} from "../repositories/orcamentoRepository.ts";
import type { UsuarioAutenticado } from "./consultaService.ts";
import type { CadastroOrcamentoDto } from "../dto/orcamento/cadastroOrcamentoDto.ts";
import type { AlteracaoOrcamentoDto } from "../dto/orcamento/alteracaoOrcamentoDto.ts";
import type { AdicaoItemOrcamentoDto } from "../dto/orcamento/adicaoItemOrcamentoDto.ts";
import type { QuantidadeItemOrcamentoDto } from "../dto/orcamento/quantidadeItemOrcamentoDto.ts";
import type { DecisaoRequisicaoOrcamentoDto } from "../dto/orcamento/decisaoRequisicaoOrcamentoDto.ts";
import type { ReaberturaOrcamentoDto } from "../dto/orcamento/reaberturaOrcamentoDto.ts";
import type { AlteracaoCabecalhoOrcamentoDto } from "../dto/orcamento/alteracaoCabecalhoOrcamentoDto.ts";
import type { SituacaoDecididaOrcamento } from "../dto/orcamento/decisaoOrcamentoDto.ts";
import type { ItemOrcamentoEntradaDto } from "../dto/orcamento/itemOrcamentoEntradaDto.ts";
import type { OrcamentoRespostaDto } from "../dto/orcamento/orcamentoRespostaDto.ts";
import type { OrcamentoResumoRespostaDto } from "../dto/orcamento/orcamentoResumoRespostaDto.ts";
import type { HistoricoOrcamentoRespostaDto } from "../dto/orcamento/historicoOrcamentoRespostaDto.ts";

import { BadRequestError } from "../errors/BadRequestError.ts";
import { ConflictError } from "../errors/ConflictError.ts";
import { NotFoundError } from "../errors/NotFoundError.ts";

import { converterDia, formatarDia } from "../utils/datas.ts";
import {
  exigirCorpo,
  idDaQuery,
  inteiroObrigatorio,
  textoObrigatorio,
  textoOpcional,
  validarId,
} from "../utils/validators.ts";


const QUANTIDADE_MINIMA = 1;
const QUANTIDADE_MAXIMA = 99;

const MENSAGEM_NAO_ENCONTRADO = "Orçamento não encontrado.";
const MENSAGEM_DATA_INVALIDA = "Data inválida. Use o formato AAAA-MM-DD.";
const MENSAGEM_QUANTIDADE =
  `A quantidade deve ser um número inteiro de ${QUANTIDADE_MINIMA} a ${QUANTIDADE_MAXIMA}.`;
const MENSAGEM_LIMITE_ITENS = "O orçamento pode ter no máximo 50 itens.";
const MENSAGEM_TOTAL_EXCEDIDO =
  "O total do orçamento não pode passar de R$ 20.000.000,00.";
const MENSAGEM_SEM_ITENS =
  "Não é possível aprovar nem recusar um orçamento sem itens.";
const MENSAGEM_NAO_PENDENTE_EDICAO =
  "Só é possível editar um orçamento pendente. Reabra o orçamento para editá-lo.";
const MENSAGEM_NAO_PENDENTE_DECISAO =
  "O orçamento já foi decidido. Para mudar a decisão, corrija a decisão ou reabra o orçamento.";
const MENSAGEM_NAO_DECIDIDO = "O orçamento ainda está pendente.";
const MENSAGEM_SEM_MUDANCA = "A alteração informada não muda o orçamento.";
const MENSAGEM_ALTERADO_POR_OUTRA_OPERACAO =
  "O orçamento foi alterado por outra operação. Consulte novamente e tente de novo.";
const MENSAGEM_PACIENTE_INATIVO_CRIACAO =
  "Não é possível criar orçamento para paciente desativado.";
const MENSAGEM_PACIENTE_INATIVO =
  "Orçamento de paciente desativado só pode ser consultado.";
const MENSAGEM_SEM_CAMPOS_CABECALHO =
  'Informe "dentista_id" ou "valido_ate" para alterar.';


type Contexto = {
  naoPendente: string;
  pacienteInativo: string;
};

const CONTEXTO_EDICAO: Contexto = {
  naoPendente: MENSAGEM_NAO_PENDENTE_EDICAO,
  pacienteInativo: MENSAGEM_PACIENTE_INATIVO,
};

const CONTEXTO_DECISAO: Contexto = {
  naoPendente: MENSAGEM_NAO_PENDENTE_DECISAO,
  pacienteInativo: MENSAGEM_PACIENTE_INATIVO,
};

const CONTEXTO_CRIACAO: Contexto = {
  naoPendente: MENSAGEM_NAO_PENDENTE_EDICAO,
  pacienteInativo: MENSAGEM_PACIENTE_INATIVO_CRIACAO,
};


function podeVerMotivos(usuario: UsuarioAutenticado): boolean {
  return usuario.perfil === Perfil.DONO || usuario.perfil === Perfil.DENTISTA;
}


function resumoDoCabecalho(orcamento: OrcamentoCompleto | OrcamentoResumo) {
  return {
    id: orcamento.id,
    paciente: {
      id: orcamento.paciente.id,
      nome: orcamento.paciente.nome,
      telefone: orcamento.paciente.telefone,
    },
    dentista: orcamento.dentista
      ? { id: orcamento.dentista.id, nome: orcamento.dentista.nome }
      : null,
    situacao: orcamento.situacao,
    total_centavos: orcamento.total_centavos,
    valido_ate:
      orcamento.valido_ate === null ? null : formatarDia(orcamento.valido_ate),
    criado_em: orcamento.criado_em,
    atualizado_em: orcamento.atualizado_em,
    criado_por: {
      id: orcamento.criado_por.id,
      nome: orcamento.criado_por.nome,
    },
    decidido_em: orcamento.decidido_em,
    decidido_por: orcamento.decidido_por
      ? { id: orcamento.decidido_por.id, nome: orcamento.decidido_por.nome }
      : null,
  };
}


function paraResposta(orcamento: OrcamentoCompleto): OrcamentoRespostaDto {
  return {
    ...resumoDoCabecalho(orcamento),
    itens: orcamento.itens.map((item) => ({
      id: item.id,
      procedimento_id: item.procedimento_id,
      nome_procedimento: item.nome_procedimento,
      valor_unitario_centavos: item.valor_unitario_centavos,
      quantidade: item.quantidade,
      subtotal_centavos: item.valor_unitario_centavos * item.quantidade,
    })),
  };
}


function paraResumo(orcamento: OrcamentoResumo): OrcamentoResumoRespostaDto {
  return {
    ...resumoDoCabecalho(orcamento),
    quantidade_itens: orcamento._count.itens,
  };
}


function paraHistorico(
  registro: HistoricoDoOrcamento,
  incluirMotivo: boolean
): HistoricoOrcamentoRespostaDto {
  return {
    id: registro.id,
    tipo: registro.tipo,
    situacao_anterior: registro.situacao_anterior,
    situacao_nova: registro.situacao_nova,
    total_anterior_centavos: registro.total_anterior_centavos,
    total_novo_centavos: registro.total_novo_centavos,
    ...(incluirMotivo ? { motivo: registro.motivo } : {}),
    registrado_em: registro.registrado_em,
    usuario: { id: registro.usuario.id, nome: registro.usuario.nome },
  };
}


function tratar(
  resultado: ResultadoDoOrcamento,
  contexto: Contexto
): OrcamentoRespostaDto {
  switch (resultado.situacao) {
    case "ok":
      return paraResposta(resultado.orcamento);
    case "nao_encontrado":
      throw new NotFoundError(MENSAGEM_NAO_ENCONTRADO);
    case "paciente_nao_encontrado":
      throw new NotFoundError("Paciente não encontrado.");
    case "paciente_inativo":
      throw new BadRequestError(contexto.pacienteInativo);
    case "dentista_nao_encontrado":
      throw new NotFoundError("Dentista não encontrado.");
    case "dentista_inativo":
      throw new BadRequestError(
        "Dentista desativado não pode ser responsável por orçamento."
      );
    case "procedimento_nao_encontrado":
      throw new NotFoundError("Procedimento não encontrado.");
    case "procedimento_inativo":
      throw new BadRequestError(
        "Procedimento desativado não pode ser incluído em orçamento."
      );
    case "item_nao_encontrado":
      throw new NotFoundError("Item não encontrado neste orçamento.");
    case "nao_pendente":
      throw new ConflictError(contexto.naoPendente);
    case "nao_decidido":
      throw new ConflictError(MENSAGEM_NAO_DECIDIDO);
    case "sem_mudanca":
      throw new ConflictError(MENSAGEM_SEM_MUDANCA);
    case "total_excedido":
      throw new BadRequestError(MENSAGEM_TOTAL_EXCEDIDO);
    case "limite_itens":
      throw new BadRequestError(MENSAGEM_LIMITE_ITENS);
    case "sem_itens":
      throw new BadRequestError(MENSAGEM_SEM_ITENS);
    case "alterada_por_outra_operacao":
      throw new ConflictError(MENSAGEM_ALTERADO_POR_OUTRA_OPERACAO);
  }
}


function lerQuantidade(corpo: Record<string, unknown>): number {
  const quantidade = inteiroObrigatorio(corpo, "quantidade");

  if (quantidade < QUANTIDADE_MINIMA || quantidade > QUANTIDADE_MAXIMA) {
    throw new BadRequestError(MENSAGEM_QUANTIDADE);
  }

  return quantidade;
}


function lerItem(valor: unknown): ItemOrcamentoEntradaDto {
  const corpo = exigirCorpo(valor);

  const procedimento_id = inteiroObrigatorio(corpo, "procedimento_id");
  validarId(procedimento_id);

  return { procedimento_id, quantidade: lerQuantidade(corpo) };
}


function lerDentista(
  corpo: Record<string, unknown>
): number | null | undefined {
  const valor = corpo.dentista_id;

  if (valor === undefined || valor === null) {
    return valor;
  }

  const id = inteiroObrigatorio(corpo, "dentista_id");
  validarId(id);

  return id;
}


function lerValidade(corpo: Record<string, unknown>): Date | null | undefined {
  const valor = corpo.valido_ate;

  if (valor === undefined || valor === null) {
    return valor;
  }

  const data = converterDia(valor);

  if (data === null) {
    throw new BadRequestError(MENSAGEM_DATA_INVALIDA);
  }

  return data;
}


function lerSituacaoDecidida(
  corpo: Record<string, unknown>
): SituacaoDecididaOrcamento {
  const situacao = textoObrigatorio(corpo, "situacao");

  if (
    situacao !== SituacaoOrcamento.APROVADO &&
    situacao !== SituacaoOrcamento.RECUSADO
  ) {
    throw new BadRequestError(
      'A situação deve ser "APROVADO" ou "RECUSADO".'
    );
  }

  return situacao;
}


async function buscarOuFalhar(id: number): Promise<OrcamentoCompleto> {
  validarId(id);

  const orcamento = await repository.findById(id);

  if (!orcamento) {
    throw new NotFoundError(MENSAGEM_NAO_ENCONTRADO);
  }

  return orcamento;
}


export async function findByPaciente(
  query: Record<string, unknown>
): Promise<OrcamentoResumoRespostaDto[]> {
  const paciente_id = idDaQuery(query, "paciente_id");

  if (paciente_id === undefined) {
    throw new BadRequestError('Informe "paciente_id".');
  }

  let situacao: SituacaoOrcamento | undefined;

  if (query.situacao !== undefined) {
    const valores: string[] = Object.values(SituacaoOrcamento);

    if (typeof query.situacao !== "string" || !valores.includes(query.situacao)) {
      throw new BadRequestError(
        'O parâmetro "situacao" deve ser PENDENTE, APROVADO ou RECUSADO.'
      );
    }

    situacao = query.situacao as SituacaoOrcamento;
  }

  const paciente = await pacienteRepository.findById(paciente_id);

  if (!paciente) {
    throw new NotFoundError("Paciente não encontrado.");
  }

  const orcamentos = await repository.findByPaciente(paciente_id, situacao);

  return orcamentos.map(paraResumo);
}


export async function findById(id: number): Promise<OrcamentoRespostaDto> {
  return paraResposta(await buscarOuFalhar(id));
}


export async function historico(
  id: number,
  usuario: UsuarioAutenticado
): Promise<HistoricoOrcamentoRespostaDto[]> {
  await buscarOuFalhar(id);

  const registros = await repository.findHistorico(id);
  const incluirMotivo = podeVerMotivos(usuario);

  return registros.map((registro) => paraHistorico(registro, incluirMotivo));
}


export async function create(
  data: CadastroOrcamentoDto,
  usuario: UsuarioAutenticado
): Promise<OrcamentoRespostaDto> {
  const corpo = exigirCorpo(data);

  const paciente_id = inteiroObrigatorio(corpo, "paciente_id");
  validarId(paciente_id);

  const dentista_id = lerDentista(corpo);
  const valido_ate = lerValidade(corpo);

  if (!Array.isArray(corpo.itens)) {
    throw new BadRequestError('O campo "itens" é obrigatório e deve ser uma lista.');
  }

  if (corpo.itens.length > repository.LIMITE_ITENS) {
    throw new BadRequestError(MENSAGEM_LIMITE_ITENS);
  }

  const itens = corpo.itens.map(lerItem);

  const resultado = await repository.criar(
    {
      paciente_id,
      ...(dentista_id !== undefined ? { dentista_id } : {}),
      ...(valido_ate !== undefined ? { valido_ate } : {}),
      itens,
    },
    usuario.id
  );

  return tratar(resultado, CONTEXTO_CRIACAO);
}


export async function updateCabecalho(
  id: number,
  data: AlteracaoOrcamentoDto,
  usuario: UsuarioAutenticado
): Promise<OrcamentoRespostaDto> {
  validarId(id);

  const corpo = exigirCorpo(data);

  const alteracao: AlteracaoCabecalhoOrcamentoDto = {};

  const dentista_id = lerDentista(corpo);
  const valido_ate = lerValidade(corpo);

  if (dentista_id !== undefined) alteracao.dentista_id = dentista_id;
  if (valido_ate !== undefined) alteracao.valido_ate = valido_ate;

  if (Object.keys(alteracao).length === 0) {
    throw new BadRequestError(MENSAGEM_SEM_CAMPOS_CABECALHO);
  }

  return tratar(
    await repository.atualizarCabecalho(id, alteracao, usuario.id),
    CONTEXTO_EDICAO
  );
}


export async function adicionarItem(
  id: number,
  data: AdicaoItemOrcamentoDto,
  usuario: UsuarioAutenticado
): Promise<OrcamentoRespostaDto> {
  validarId(id);

  const item = lerItem(data);

  return tratar(
    await repository.adicionarItem(id, item, usuario.id),
    CONTEXTO_EDICAO
  );
}


export async function alterarQuantidade(
  id: number,
  itemId: number,
  data: QuantidadeItemOrcamentoDto,
  usuario: UsuarioAutenticado
): Promise<OrcamentoRespostaDto> {
  validarId(id);
  validarId(itemId);

  const quantidade = lerQuantidade(exigirCorpo(data));

  return tratar(
    await repository.alterarQuantidadeDoItem(id, itemId, quantidade, usuario.id),
    CONTEXTO_EDICAO
  );
}


export async function removerItem(
  id: number,
  itemId: number,
  usuario: UsuarioAutenticado
): Promise<OrcamentoRespostaDto> {
  validarId(id);
  validarId(itemId);

  return tratar(
    await repository.removerItem(id, itemId, usuario.id),
    CONTEXTO_EDICAO
  );
}


export async function decidir(
  id: number,
  data: DecisaoRequisicaoOrcamentoDto,
  usuario: UsuarioAutenticado
): Promise<OrcamentoRespostaDto> {
  validarId(id);

  const corpo = exigirCorpo(data);

  const situacao = lerSituacaoDecidida(corpo);
  const motivo = textoOpcional(corpo, "motivo");

  return tratar(
    await repository.decidir(id, { situacao, motivo: motivo ?? null }, usuario.id),
    CONTEXTO_DECISAO
  );
}


export async function corrigirDecisao(
  id: number,
  data: DecisaoRequisicaoOrcamentoDto,
  usuario: UsuarioAutenticado
): Promise<OrcamentoRespostaDto> {
  validarId(id);

  const corpo = exigirCorpo(data);

  const situacao = lerSituacaoDecidida(corpo);
  const motivo = textoObrigatorio(corpo, "motivo");

  return tratar(
    await repository.corrigirDecisao(id, { situacao, motivo }, usuario.id),
    CONTEXTO_DECISAO
  );
}


export async function reabrir(
  id: number,
  data: ReaberturaOrcamentoDto,
  usuario: UsuarioAutenticado
): Promise<OrcamentoRespostaDto> {
  validarId(id);

  const motivo = textoObrigatorio(exigirCorpo(data), "motivo");

  return tratar(
    await repository.reabrir(id, { motivo }, usuario.id),
    CONTEXTO_DECISAO
  );
}
