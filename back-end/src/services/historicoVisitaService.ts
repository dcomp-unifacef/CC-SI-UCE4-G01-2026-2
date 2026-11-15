import * as repository from "../repositories/historicoVisitaRepository.ts";
import * as pacienteService from "./pacienteService.ts";
import * as dentistaService from "./dentistaService.ts";
import * as acessoService from "./acessoService.ts";

import { TipoAcessoPaciente } from "../../generated/prisma/client.ts";

import type { UsuarioAutenticado } from "./consultaService.ts";

import type { HistoricoVisita } from "../../generated/prisma/client.ts";
import type { CreateHistoricoVisitaDto } from "../dto/historicoVisita/createHistoricoVisitaDto.ts";
import type { UpdateHistoricoVisitaDto } from "../dto/historicoVisita/updateHistoricoVisitaDto.ts";

import { NotFoundError } from "../errors/NotFoundError.ts";
import { BadRequestError } from "../errors/BadRequestError.ts";
import { ConflictError } from "../errors/ConflictError.ts";

import {
  converterData,
  dataFutura,
  erroPrisma,
  exigirCorpo,
  inteiroObrigatorio,
  inteiroOpcional,
  textoObrigatorio,
  textoOpcional,
  validarId,
} from "../utils/validators.ts";


const MENSAGEM_VISITA_COM_RETORNO =
  "Visita possui retorno vinculado e não pode ser excluída. Descartar o retorno não libera a exclusão, porque o histórico de retornos é preservado.";
const MENSAGEM_VISITA_DE_CONSULTA =
  "Visita registrada a partir de uma consulta e não pode ser excluída.";
const MENSAGEM_PACIENTE_COM_RETORNO =
  "O paciente de uma visita com retorno vinculado não pode ser alterado.";
const MENSAGEM_PACIENTE_DE_CONSULTA =
  "O paciente de uma visita registrada a partir de uma consulta não pode ser alterado.";
const MENSAGEM_ALTERADA_POR_OUTRA_OPERACAO =
  "A visita foi alterada por outra operação. Consulte novamente e tente de novo.";


async function validarPaciente(
  pacienteId: number,
  permitirArquivado: boolean
): Promise<void> {
  const paciente = await pacienteService.findById(pacienteId);

  if (!paciente.ativo && !permitirArquivado) {
    throw new BadRequestError(
      "Não é possível registrar visita para paciente desativado."
    );
  }
}


async function validarDentista(
  dentistaId: number,
  permitirInativo: boolean
): Promise<void> {
  const dentista = await dentistaService.findById(dentistaId);

  if (!dentista.ativo && !permitirInativo) {
    throw new BadRequestError(
      "Não é possível registrar visita com dentista desativado."
    );
  }
}


function validarDataVisita(valor: unknown): Date {
  const data = converterData(valor);

  if (data === null) {
    throw new BadRequestError("Data da visita inválida.");
  }

  if (dataFutura(data)) {
    throw new BadRequestError("A data da visita não pode ser futura.");
  }

  return data;
}


export async function findAll() {
  return repository.findAll();
}


export async function findById(id: number) {
  validarId(id);

  const visita = await repository.findById(id);

  if (!visita) {
    throw new NotFoundError("Visita não encontrada.");
  }

  return visita;
}


export async function listar(usuario: UsuarioAutenticado) {
  const visitas = await findAll();

  if (visitas.length === 0) {
    return visitas;
  }

  await acessoService.registrarLista(
    usuario,
    TipoAcessoPaciente.LISTA_VISITAS,
    visitas.map((visita) => visita.paciente_id)
  );

  return visitas;
}


export async function consultar(id: number, usuario: UsuarioAutenticado) {
  const visita = await findById(id);

  await acessoService.registrar(
    usuario,
    TipoAcessoPaciente.VISITA,
    visita.paciente_id
  );

  return visita;
}


async function criar(
  data: unknown,
  antigo: boolean
): Promise<HistoricoVisita> {
  const corpo = exigirCorpo(data);

  const data_visita = validarDataVisita(corpo.data_visita);
  const procedimento = textoObrigatorio(corpo, "procedimento");
  const observacoes = textoOpcional(corpo, "observacoes");
  const paciente_id = inteiroObrigatorio(corpo, "paciente_id");
  const dentista_id = inteiroObrigatorio(corpo, "dentista_id");

  await validarPaciente(paciente_id, antigo);
  await validarDentista(dentista_id, antigo);

  const nova: CreateHistoricoVisitaDto = {
    data_visita,
    procedimento,
    dentista_id,
    observacoes,
    paciente_id,
  };

  return repository.create(antigo ? { ...nova, registro_antigo: true } : nova);
}


export async function create(
  data: CreateHistoricoVisitaDto
): Promise<HistoricoVisita> {
  return criar(data, false);
}


export async function createAntigo(
  data: CreateHistoricoVisitaDto
): Promise<HistoricoVisita> {
  return criar(data, true);
}


export async function update(
  id: number,
  data: UpdateHistoricoVisitaDto
): Promise<HistoricoVisita> {
  const atual = await findById(id);

  const corpo = exigirCorpo(data);
  const alteracoes: UpdateHistoricoVisitaDto = {};

  if (corpo.data_visita !== undefined) {
    alteracoes.data_visita = validarDataVisita(corpo.data_visita);
  }

  if (corpo.procedimento !== undefined) {
    alteracoes.procedimento = textoObrigatorio(corpo, "procedimento");
  }

  alteracoes.observacoes = textoOpcional(corpo, "observacoes");

  const paciente_id = inteiroOpcional(corpo, "paciente_id");

  if (paciente_id !== undefined) {
    await validarPaciente(paciente_id, false);
    alteracoes.paciente_id = paciente_id;
  }

  const dentista_id = inteiroOpcional(corpo, "dentista_id");

  if (dentista_id !== undefined) {
    await validarDentista(dentista_id, false);
    alteracoes.dentista_id = dentista_id;
  }

  if (paciente_id !== undefined && paciente_id !== atual.paciente_id) {
    const resultado = await repository.updateComTrocaDePaciente(id, {
      ...alteracoes,
      paciente_id,
    });

    switch (resultado.situacao) {
      case "alterada":
        return resultado.visita;
      case "nao_encontrada":
        throw new NotFoundError("Visita não encontrada.");
      case "com_retorno":
        throw new ConflictError(MENSAGEM_PACIENTE_COM_RETORNO);
      case "com_consulta":
        throw new ConflictError(MENSAGEM_PACIENTE_DE_CONSULTA);
      case "alterada_por_outra_operacao":
        throw new ConflictError(MENSAGEM_ALTERADA_POR_OUTRA_OPERACAO);
    }
  }

  return repository.update(id, alteracoes);
}


export async function remove(
  id: number
): Promise<HistoricoVisita> {
  validarId(id);

  const vinculos = await repository.contarVinculos(id);

  if (vinculos === null) {
    throw new NotFoundError("Visita não encontrada.");
  }

  if (vinculos.retornos > 0) {
    throw new ConflictError(MENSAGEM_VISITA_COM_RETORNO);
  }

  if (vinculos.consulta_id !== null) {
    throw new ConflictError(MENSAGEM_VISITA_DE_CONSULTA);
  }

  try {
    return await repository.remove(id);
  }
  catch (error) {
    if (erroPrisma(error, "P2003")) {
      throw new ConflictError(MENSAGEM_VISITA_COM_RETORNO);
    }

    throw error;
  }
}
