import * as repository from "../repositories/pacienteRepository.ts";

import { StatusConsulta } from "../../generated/prisma/client.ts";
import type { Paciente } from "../../generated/prisma/client.ts";
import type { CreatePacienteDto } from "../dto/paciente/createPacienteDto.ts";
import type { UpdatePacienteDto } from "../dto/paciente/updatePacienteDto.ts";

import { NotFoundError } from "../errors/NotFoundError.ts";
import { BadRequestError } from "../errors/BadRequestError.ts";
import { ConflictError } from "../errors/ConflictError.ts";

import { isValidCpf, normalizeCpf } from "../utils/cpf.ts";
import {
  booleanoOpcional,
  converterData,
  dataFutura,
  emailValido,
  erroPrisma,
  exigirCorpo,
  textoObrigatorio,
  textoOpcional,
  validarId,
} from "../utils/validators.ts";
import type { Corpo } from "../utils/validators.ts";


const MENSAGEM_CPF_DUPLICADO = "Já existe um paciente cadastrado com este CPF.";
const MENSAGEM_COM_VISITAS =
  "Paciente possui histórico de visitas e não pode ser excluído. Desative o cadastro.";
const MENSAGEM_COM_CONSULTAS =
  "Paciente possui consultas na agenda e não pode ser excluído. Desative o cadastro.";
const MENSAGEM_COM_CONSULTA_FUTURA =
  "Paciente possui consulta futura agendada ou confirmada e não pode ser desativado.";


function lerUf(corpo: Corpo): string | null | undefined {
  const uf = textoOpcional(corpo, "uf");

  if (uf === undefined || uf === null) return uf;

  if (!/^[A-Za-z]{2}$/.test(uf)) {
    throw new BadRequestError("UF deve conter 2 letras.");
  }

  return uf.toUpperCase();
}


function lerEmail(corpo: Corpo): string | null | undefined {
  const email = textoOpcional(corpo, "email");

  if (typeof email === "string" && !emailValido(email)) {
    throw new BadRequestError("E-mail inválido.");
  }

  return email;
}


function lerDataNascimento(valor: unknown): Date {
  const data = converterData(valor);

  if (data === null || dataFutura(data)) {
    throw new BadRequestError("Data de nascimento inválida.");
  }

  return data;
}


export async function findAll(): Promise<Paciente[]> {
  return repository.findAll();
}


export async function findById(
  id: number
): Promise<Paciente> {
  validarId(id);

  const paciente = await repository.findById(id);

  if (!paciente) {
    throw new NotFoundError("Paciente não encontrado.");
  }

  return paciente;
}


export async function create(
  data: CreatePacienteDto
): Promise<Paciente> {
  const corpo = exigirCorpo(data);

  const nome = textoObrigatorio(corpo, "nome");
  const cpfInformado = textoObrigatorio(corpo, "cpf");
  const telefone = textoObrigatorio(corpo, "telefone");

  if (corpo.data_nascimento === undefined || corpo.data_nascimento === null) {
    throw new BadRequestError('O campo "data_nascimento" é obrigatório.');
  }

  const cpf = normalizeCpf(cpfInformado);

  if (!isValidCpf(cpf)) {
    throw new BadRequestError("CPF inválido.");
  }

  if (await repository.findByCpf(cpf)) {
    throw new ConflictError(MENSAGEM_CPF_DUPLICADO);
  }

  const novo: CreatePacienteDto = {
    nome,
    cpf,
    data_nascimento: lerDataNascimento(corpo.data_nascimento),
    logradouro: textoOpcional(corpo, "logradouro"),
    numero: textoOpcional(corpo, "numero"),
    complemento: textoOpcional(corpo, "complemento"),
    bairro: textoOpcional(corpo, "bairro"),
    municipio: textoOpcional(corpo, "municipio"),
    uf: lerUf(corpo),
    telefone,
    email: lerEmail(corpo),
  };

  try {
    return await repository.create(novo);
  }
  catch (error) {
    if (erroPrisma(error, "P2002")) {
      throw new ConflictError(MENSAGEM_CPF_DUPLICADO);
    }

    throw error;
  }
}


export async function update(
  id: number,
  data: UpdatePacienteDto
): Promise<Paciente> {
  const atual = await findById(id);

  const corpo = exigirCorpo(data);

  if ("cpf" in corpo) {
    throw new BadRequestError("O CPF não pode ser alterado.");
  }

  const alteracoes: UpdatePacienteDto = {};

  if (corpo.nome !== undefined) alteracoes.nome = textoObrigatorio(corpo, "nome");
  if (corpo.telefone !== undefined) alteracoes.telefone = textoObrigatorio(corpo, "telefone");

  if (corpo.data_nascimento !== undefined) {
    alteracoes.data_nascimento = lerDataNascimento(corpo.data_nascimento);
  }

  alteracoes.logradouro = textoOpcional(corpo, "logradouro");
  alteracoes.numero = textoOpcional(corpo, "numero");
  alteracoes.complemento = textoOpcional(corpo, "complemento");
  alteracoes.bairro = textoOpcional(corpo, "bairro");
  alteracoes.municipio = textoOpcional(corpo, "municipio");
  alteracoes.uf = lerUf(corpo);
  alteracoes.email = lerEmail(corpo);
  alteracoes.ativo = booleanoOpcional(corpo, "ativo");

  if (alteracoes.ativo === false && atual.ativo) {
    const resultado = await repository.desativarSeSemConsultaFutura(
      id,
      new Date(),
      [StatusConsulta.AGENDADA, StatusConsulta.CONFIRMADA]
    );

    if (resultado.situacao === "com_consulta_futura") {
      throw new ConflictError(MENSAGEM_COM_CONSULTA_FUTURA);
    }

    alteracoes.ativo = undefined;
  }

  return repository.update(id, alteracoes);
}


export async function remove(
  id: number
): Promise<Paciente> {
  await findById(id);

  if (await repository.countVisitas(id) > 0) {
    throw new ConflictError(MENSAGEM_COM_VISITAS);
  }

  if (await repository.countConsultas(id) > 0) {
    throw new ConflictError(MENSAGEM_COM_CONSULTAS);
  }

  try {
    return await repository.remove(id);
  }
  catch (error) {
    if (erroPrisma(error, "P2003")) {
      throw new ConflictError(MENSAGEM_COM_VISITAS);
    }

    throw error;
  }
}
