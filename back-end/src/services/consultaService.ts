import * as repository from "../repositories/consultaRepository.ts";
import * as historicoRepository from "../repositories/historicoConsultaRepository.ts";
import * as configuracaoRepository from "../repositories/configuracaoRepository.ts";
import * as pacienteRepository from "../repositories/pacienteRepository.ts";
import * as dentistaRepository from "../repositories/dentistaRepository.ts";

import { Perfil, StatusConsulta } from "../../generated/prisma/client.ts";

import type { ConsultaCompleta } from "../repositories/consultaRepository.ts";
import type { CadastroConsultaDto } from "../dto/consulta/cadastroConsultaDto.ts";
import type { AlteracaoStatusConsultaDto } from "../dto/consulta/alteracaoStatusConsultaDto.ts";
import type { ReagendamentoConsultaDto } from "../dto/consulta/reagendamentoConsultaDto.ts";
import type { ConsultaRespostaDto } from "../dto/consulta/consultaRespostaDto.ts";
import type { HistoricoConsultaRespostaDto } from "../dto/consulta/historicoConsultaRespostaDto.ts";

import { AppError } from "../errors/AppError.ts";
import { BadRequestError } from "../errors/BadRequestError.ts";
import { ConflictError } from "../errors/ConflictError.ts";
import { ForbiddenError } from "../errors/ForbiddenError.ts";
import { NotFoundError } from "../errors/NotFoundError.ts";

import {
  converterDataHora,
  formatarDataHora,
  limitesDoDia,
} from "../utils/datas.ts";
import {
  booleanoOpcional,
  erroPrisma,
  exigirCorpo,
  inteiroObrigatorio,
  inteiroOpcional,
  textoObrigatorio,
  textoOpcional,
  validarId,
} from "../utils/validators.ts";


export interface UsuarioAutenticado {
  id: number;
  perfil: Perfil;
}


const MENSAGEM_INTERNA = "Erro interno do servidor.";
const MENSAGEM_ACESSO_NEGADO = "Acesso negado.";
const MENSAGEM_DATA_INVALIDA =
  "Data e hora inválidas. Use o formato ISO 8601 com fuso, por exemplo 2030-04-01T09:00:00-03:00.";
const MENSAGEM_PACIENTE_DESATIVADO =
  "Paciente desativado não pode ter consulta na agenda.";
const MENSAGEM_HORARIO_INDISPONIVEL =
  "Horário indisponível para este dentista.";
const MENSAGEM_ALTERADA_POR_OUTRA_OPERACAO =
  "A consulta foi alterada por outra operação. Consulte novamente e tente de novo.";

const TOLERANCIA_DO_ENCAIXE_MS = 30 * 60 * 1000;

const STATUS_DO_DENTISTA: StatusConsulta[] = [
  StatusConsulta.CONFIRMADA,
  StatusConsulta.REALIZADA,
  StatusConsulta.FALTOU,
];

const STATUS_QUE_PERMITEM_REAGENDAR: StatusConsulta[] = [
  StatusConsulta.AGENDADA,
  StatusConsulta.CONFIRMADA,
];

const TRANSICOES: Record<StatusConsulta, StatusConsulta[]> = {
  [StatusConsulta.AGENDADA]: [
    StatusConsulta.CONFIRMADA,
    StatusConsulta.CANCELADA,
    StatusConsulta.FALTOU,
    StatusConsulta.REALIZADA,
  ],
  [StatusConsulta.CONFIRMADA]: [
    StatusConsulta.REALIZADA,
    StatusConsulta.FALTOU,
    StatusConsulta.CANCELADA,
    StatusConsulta.AGENDADA,
  ],
  [StatusConsulta.CANCELADA]: [StatusConsulta.AGENDADA],
  [StatusConsulta.REALIZADA]: [],
  [StatusConsulta.FALTOU]: [],
};


function violouExclusao(error: unknown): boolean {
  const meta = (error as {
    meta?: { driverAdapterError?: { cause?: { originalCode?: string } } };
  } | null)?.meta;

  return (
    erroPrisma(error, "P2039") &&
    meta?.driverAdapterError?.cause?.originalCode === "23P01"
  );
}


function mensagemDeConflito(conflitos: ConsultaCompleta[]): string {
  const primeira = conflitos[0];

  if (!primeira) return MENSAGEM_HORARIO_INDISPONIVEL;

  return (
    `Horário indisponível: o dentista já possui consulta de ` +
    `${primeira.paciente.nome} de ${formatarDataHora(primeira.inicio_em)} ` +
    `a ${formatarDataHora(primeira.fim_em)}.`
  );
}


function paraResposta(consulta: ConsultaCompleta): ConsultaRespostaDto {
  return {
    id: consulta.id,
    paciente: {
      id: consulta.paciente.id,
      nome: consulta.paciente.nome,
      telefone: consulta.paciente.telefone,
    },
    dentista: {
      id: consulta.dentista.id,
      nome: consulta.dentista.nome,
    },
    inicio_em: consulta.inicio_em,
    fim_em: consulta.fim_em,
    duracao_min: consulta.duracao_min,
    status: consulta.status,
    encaixe: consulta.encaixe,
    criada_em: consulta.criada_em,
    atualizada_em: consulta.atualizada_em,
  };
}


function lerDataHora(corpo: Record<string, unknown>, campo: string): Date {
  const texto = textoObrigatorio(corpo, campo);
  const data = converterDataHora(texto);

  if (data === null) {
    throw new BadRequestError(MENSAGEM_DATA_INVALIDA);
  }

  return data;
}


function textoDaQuery(
  query: Record<string, unknown>,
  campo: string
): string | undefined {
  const valor = query[campo];

  if (valor === undefined) return undefined;

  if (typeof valor !== "string" || valor.trim() === "") {
    throw new BadRequestError(`O parâmetro "${campo}" é inválido.`);
  }

  return valor.trim();
}


function idDaQuery(
  query: Record<string, unknown>,
  campo: string
): number | undefined {
  const texto = textoDaQuery(query, campo);

  if (texto === undefined) return undefined;

  if (!/^\d{1,10}$/.test(texto)) {
    throw new BadRequestError(`O parâmetro "${campo}" é inválido.`);
  }

  const id = Number(texto);
  validarId(id);

  return id;
}


async function lerDuracaoMaxima(): Promise<number> {
  const configuracao = await configuracaoRepository.find();

  if (!configuracao) {
    throw new AppError(MENSAGEM_INTERNA, 500);
  }

  return configuracao.consulta_duracao_max_min;
}


function validarDuracao(duracao: number, maximo: number): void {
  if (duracao <= 0) {
    throw new BadRequestError('O campo "duracao_min" deve ser maior que zero.');
  }

  if (duracao > maximo) {
    throw new BadRequestError(
      `A duração máxima de uma consulta é de ${maximo} minutos.`
    );
  }
}


async function buscarOuFalhar(id: number): Promise<ConsultaCompleta> {
  validarId(id);

  const consulta = await repository.findById(id);

  if (!consulta) {
    throw new NotFoundError("Consulta não encontrada.");
  }

  return consulta;
}


export async function findAll(
  query: Record<string, unknown>
): Promise<ConsultaRespostaDto[]> {
  const paciente_id = idDaQuery(query, "paciente_id");
  const dentista_id = idDaQuery(query, "dentista_id");
  const dia = textoDaQuery(query, "dia");
  const inicioTexto = textoDaQuery(query, "inicio");
  const fimTexto = textoDaQuery(query, "fim");

  if (paciente_id !== undefined) {
    if (
      dentista_id !== undefined ||
      dia !== undefined ||
      inicioTexto !== undefined ||
      fimTexto !== undefined
    ) {
      throw new BadRequestError(
        "O filtro por paciente não pode ser combinado com dentista ou período."
      );
    }

    const consultas = await repository.findByPaciente(paciente_id);

    return consultas.map(paraResposta);
  }

  let inicio: Date;
  let fim: Date;

  if (dia !== undefined) {
    if (inicioTexto !== undefined || fimTexto !== undefined) {
      throw new BadRequestError(
        'Use "dia" ou "inicio" e "fim", não os dois ao mesmo tempo.'
      );
    }

    const limites = limitesDoDia(dia);

    if (limites === null) {
      throw new BadRequestError('O parâmetro "dia" deve estar no formato AAAA-MM-DD.');
    }

    inicio = limites.inicio;
    fim = limites.fim;
  }
  else if (inicioTexto !== undefined && fimTexto !== undefined) {
    const inicioLido = converterDataHora(inicioTexto);
    const fimLido = converterDataHora(fimTexto);

    if (inicioLido === null || fimLido === null) {
      throw new BadRequestError(MENSAGEM_DATA_INVALIDA);
    }

    if (inicioLido.getTime() >= fimLido.getTime()) {
      throw new BadRequestError('O parâmetro "inicio" deve ser anterior a "fim".');
    }

    inicio = inicioLido;
    fim = fimLido;
  }
  else {
    throw new BadRequestError(
      'Informe "paciente_id", "dia" ou "inicio" e "fim".'
    );
  }

  const consultas = await repository.findByPeriodo(inicio, fim, dentista_id);

  return consultas.map(paraResposta);
}


export async function findById(id: number): Promise<ConsultaRespostaDto> {
  return paraResposta(await buscarOuFalhar(id));
}


export async function historico(
  id: number
): Promise<HistoricoConsultaRespostaDto[]> {
  await buscarOuFalhar(id);

  const registros = await historicoRepository.findByConsulta(id);

  return registros.map((registro) => ({
    id: registro.id,
    tipo: registro.tipo,
    status_anterior: registro.status_anterior,
    status_novo: registro.status_novo,
    inicio_anterior: registro.inicio_anterior,
    inicio_novo: registro.inicio_novo,
    duracao_anterior_min: registro.duracao_anterior_min,
    duracao_nova_min: registro.duracao_nova_min,
    motivo: registro.motivo,
    registrado_em: registro.registrado_em,
    usuario: {
      id: registro.usuario.id,
      nome: registro.usuario.nome,
    },
  }));
}


export async function create(
  data: CadastroConsultaDto,
  usuario: UsuarioAutenticado
): Promise<ConsultaRespostaDto> {
  const corpo = exigirCorpo(data);

  const paciente_id = inteiroObrigatorio(corpo, "paciente_id");
  const dentista_id = inteiroObrigatorio(corpo, "dentista_id");
  const duracao_min = inteiroObrigatorio(corpo, "duracao_min");
  const encaixe = booleanoOpcional(corpo, "encaixe") ?? false;
  const inicio_em = lerDataHora(corpo, "inicio_em");

  validarId(paciente_id);
  validarId(dentista_id);

  validarDuracao(duracao_min, await lerDuracaoMaxima());

  const agora = Date.now();

  if (encaixe) {
    if (inicio_em.getTime() < agora - TOLERANCIA_DO_ENCAIXE_MS) {
      throw new BadRequestError(
        "O encaixe pode começar no máximo 30 minutos antes do momento atual."
      );
    }
  }
  else if (inicio_em.getTime() <= agora) {
    throw new BadRequestError(
      "A consulta deve ser marcada para uma data e hora futuras. Para atendimento imediato, use encaixe."
    );
  }

  const paciente = await pacienteRepository.findById(paciente_id);

  if (!paciente) {
    throw new BadRequestError("Paciente não encontrado.");
  }

  if (!paciente.ativo) {
    throw new BadRequestError(MENSAGEM_PACIENTE_DESATIVADO);
  }

  const dentista = await dentistaRepository.findById(dentista_id);

  if (!dentista) {
    throw new BadRequestError("Dentista não encontrado.");
  }

  if (!dentista.ativo) {
    throw new BadRequestError("Dentista desativado não pode receber consultas.");
  }

  const fim_em = new Date(inicio_em.getTime() + duracao_min * 60 * 1000);

  const conflitos = await repository.findConflitos(
    dentista_id,
    inicio_em,
    fim_em
  );

  if (conflitos.length > 0) {
    throw new ConflictError(mensagemDeConflito(conflitos));
  }

  try {
    const criada = await repository.criarComHistorico(
      { paciente_id, dentista_id, inicio_em, duracao_min, encaixe },
      usuario.id
    );

    if (criada === null) {
      throw new BadRequestError(MENSAGEM_PACIENTE_DESATIVADO);
    }

    return paraResposta(criada);
  }
  catch (error) {
    if (violouExclusao(error)) {
      const atuais = await repository.findConflitos(
        dentista_id,
        inicio_em,
        fim_em
      );

      throw new ConflictError(mensagemDeConflito(atuais));
    }

    throw error;
  }
}


export async function mudarStatus(
  id: number,
  data: AlteracaoStatusConsultaDto,
  usuario: UsuarioAutenticado
): Promise<ConsultaRespostaDto> {
  validarId(id);

  const corpo = exigirCorpo(data);
  const statusTexto = textoObrigatorio(corpo, "status");

  const novo = (Object.values(StatusConsulta) as string[]).includes(statusTexto)
    ? (statusTexto as StatusConsulta)
    : null;

  if (novo === null) {
    throw new BadRequestError('O campo "status" é inválido.');
  }

  if (usuario.perfil === Perfil.DENTISTA && !STATUS_DO_DENTISTA.includes(novo)) {
    throw new ForbiddenError(MENSAGEM_ACESSO_NEGADO);
  }

  const consulta = await buscarOuFalhar(id);

  if (consulta.status === novo) {
    throw new ConflictError("A consulta já está com este status.");
  }

  if (!TRANSICOES[consulta.status].includes(novo)) {
    throw new ConflictError(
      `Não é possível mudar a consulta de ${consulta.status} para ${novo}.`
    );
  }

  const motivo =
    novo === StatusConsulta.CANCELADA
      ? textoObrigatorio(corpo, "motivo")
      : textoOpcional(corpo, "motivo");

  const agora = Date.now();

  if (
    (novo === StatusConsulta.REALIZADA || novo === StatusConsulta.FALTOU) &&
    consulta.inicio_em.getTime() > agora
  ) {
    throw new ConflictError(
      "Só é possível registrar a consulta como realizada ou faltou depois do horário de início."
    );
  }

  const reabertura =
    consulta.status === StatusConsulta.CANCELADA &&
    novo === StatusConsulta.AGENDADA;

  if (reabertura) {
    if (consulta.inicio_em.getTime() <= agora) {
      throw new ConflictError(
        "Consulta cancelada com horário já passado não pode ser reaberta."
      );
    }

    const dentista = await dentistaRepository.findById(consulta.dentista.id);

    if (!dentista || !dentista.ativo) {
      throw new ConflictError("Dentista desativado não pode receber consultas.");
    }

    const conflitos = await repository.findConflitos(
      consulta.dentista.id,
      consulta.inicio_em,
      consulta.fim_em,
      consulta.id
    );

    if (conflitos.length > 0) {
      throw new ConflictError(mensagemDeConflito(conflitos));
    }
  }

  try {
    const resultado = await repository.mudarStatus(
      id,
      novo,
      usuario.id,
      motivo,
      reabertura
    );

    switch (resultado.situacao) {
      case "alterada":
        return paraResposta(resultado.consulta);
      case "nao_encontrada":
        throw new NotFoundError("Consulta não encontrada.");
      case "paciente_inativo":
        throw new ConflictError(MENSAGEM_PACIENTE_DESATIVADO);
      case "sem_mudanca":
        throw new ConflictError("A consulta já está com este status.");
      case "alterada_por_outra_operacao":
        throw new ConflictError(MENSAGEM_ALTERADA_POR_OUTRA_OPERACAO);
    }
  }
  catch (error) {
    if (violouExclusao(error)) {
      const atuais = await repository.findConflitos(
        consulta.dentista.id,
        consulta.inicio_em,
        consulta.fim_em,
        consulta.id
      );

      throw new ConflictError(mensagemDeConflito(atuais));
    }

    throw error;
  }
}


export async function reagendar(
  id: number,
  data: ReagendamentoConsultaDto,
  usuario: UsuarioAutenticado
): Promise<ConsultaRespostaDto> {
  validarId(id);

  const corpo = exigirCorpo(data);

  const motivo = textoObrigatorio(corpo, "motivo");
  const inicio_em = lerDataHora(corpo, "inicio_em");
  const duracaoInformada = inteiroOpcional(corpo, "duracao_min");

  const consulta = await buscarOuFalhar(id);

  if (!STATUS_QUE_PERMITEM_REAGENDAR.includes(consulta.status)) {
    throw new ConflictError(
      "Só é possível reagendar consultas agendadas ou confirmadas."
    );
  }

  if (inicio_em.getTime() <= Date.now()) {
    throw new BadRequestError("O novo horário deve ser futuro.");
  }

  const duracao_min = duracaoInformada ?? consulta.duracao_min;

  if (duracao_min !== consulta.duracao_min) {
    validarDuracao(duracao_min, await lerDuracaoMaxima());
  }

  if (
    inicio_em.getTime() === consulta.inicio_em.getTime() &&
    duracao_min === consulta.duracao_min
  ) {
    throw new ConflictError("O novo horário é igual ao atual.");
  }

  const fim_em = new Date(inicio_em.getTime() + duracao_min * 60 * 1000);

  const conflitos = await repository.findConflitos(
    consulta.dentista.id,
    inicio_em,
    fim_em,
    consulta.id
  );

  if (conflitos.length > 0) {
    throw new ConflictError(mensagemDeConflito(conflitos));
  }

  try {
    const resultado = await repository.reagendar(
      id,
      { inicio_em, duracao_min },
      usuario.id,
      motivo
    );

    switch (resultado.situacao) {
      case "alterada":
        return paraResposta(resultado.consulta);
      case "nao_encontrada":
        throw new NotFoundError("Consulta não encontrada.");
      case "paciente_inativo":
        throw new ConflictError(MENSAGEM_PACIENTE_DESATIVADO);
      case "sem_mudanca":
        throw new ConflictError("O novo horário é igual ao atual.");
      case "alterada_por_outra_operacao":
        throw new ConflictError(MENSAGEM_ALTERADA_POR_OUTRA_OPERACAO);
    }
  }
  catch (error) {
    if (violouExclusao(error)) {
      const atuais = await repository.findConflitos(
        consulta.dentista.id,
        inicio_em,
        fim_em,
        consulta.id
      );

      throw new ConflictError(mensagemDeConflito(atuais));
    }

    throw error;
  }
}
