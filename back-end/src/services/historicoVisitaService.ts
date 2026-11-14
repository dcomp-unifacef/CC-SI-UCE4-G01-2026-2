import * as repository from "../repositories/historicoVisitaRepository.ts";
import * as pacienteService from "./pacienteService.ts";
import * as dentistaService from "./dentistaService.ts";

import type { HistoricoVisita } from "../../generated/prisma/client.ts";
import type { CreateHistoricoVisitaDto } from "../dto/historicoVisita/createHistoricoVisitaDto.ts";
import type { UpdateHistoricoVisitaDto } from "../dto/historicoVisita/updateHistoricoVisitaDto.ts";

import { NotFoundError } from "../errors/NotFoundError.ts";
import { BadRequestError } from "../errors/BadRequestError.ts";

import {
  converterData,
  dataFutura,
  exigirCorpo,
  inteiroObrigatorio,
  inteiroOpcional,
  textoObrigatorio,
  textoOpcional,
  validarId,
} from "../utils/validators.ts";


// Só se registra visita de paciente existente e ativo (regra de negócio).
// Reaproveita pacienteService.findById(), que lança "Paciente não encontrado.".
// Atendimentos antigos podem ser lançados para pacientes arquivados.
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


// O dentista deve existir e, para visitas novas, estar ativo.
// Dentistas antigos ou externos (inativos) servem a atendimentos antigos.
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


// A visita registra um atendimento que já aconteceu: a data não pode ser futura
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

  // O atendimento antigo fica identificado para auditoria
  return repository.create(antigo ? { ...nova, registro_antigo: true } : nova);
}


export async function create(
  data: CreateHistoricoVisitaDto
): Promise<HistoricoVisita> {
  return criar(data, false);
}


// Operação específica para cadastrar atendimentos antigos (fichas físicas),
// inclusive de pacientes arquivados.
export async function createAntigo(
  data: CreateHistoricoVisitaDto
): Promise<HistoricoVisita> {
  return criar(data, true);
}


export async function update(
  id: number,
  data: UpdateHistoricoVisitaDto
): Promise<HistoricoVisita> {
  await findById(id);

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

  return repository.update(id, alteracoes);
}


export async function remove(
  id: number
): Promise<HistoricoVisita> {
  await findById(id);

  return repository.remove(id);
}
