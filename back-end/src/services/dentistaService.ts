import * as repository from "../repositories/dentistaRepository.ts";

import type { Dentista } from "../../generated/prisma/client.ts";
import type { CreateDentistaDto } from "../dto/dentista/createDentistaDto.ts";
import type { UpdateDentistaDto } from "../dto/dentista/updateDentistaDto.ts";

import { NotFoundError } from "../errors/NotFoundError.ts";
import { ConflictError } from "../errors/ConflictError.ts";

import {
  booleanoOpcional,
  erroPrisma,
  exigirCorpo,
  textoObrigatorio,
  validarId,
} from "../utils/validators.ts";


const MENSAGEM_COM_VISITAS =
  "Dentista possui histórico de visitas e não pode ser excluído. Desative o cadastro.";


const MENSAGEM_COM_CONSULTAS =
  "Dentista possui consultas na agenda e não pode ser excluído. Desative o cadastro.";


export async function findAll(): Promise<Dentista[]> {
  return repository.findAll();
}


export async function findById(
  id: number
): Promise<Dentista> {
  validarId(id);

  const dentista = await repository.findById(id);

  if (!dentista) {
    throw new NotFoundError("Dentista não encontrado.");
  }

  return dentista;
}


export async function create(
  data: CreateDentistaDto
): Promise<Dentista> {
  const corpo = exigirCorpo(data);

  return repository.create({
    nome: textoObrigatorio(corpo, "nome"),
  });
}


export async function update(
  id: number,
  data: UpdateDentistaDto
): Promise<Dentista> {
  await findById(id);

  const corpo = exigirCorpo(data);
  const alteracoes: UpdateDentistaDto = {};

  if (corpo.nome !== undefined) alteracoes.nome = textoObrigatorio(corpo, "nome");
  alteracoes.ativo = booleanoOpcional(corpo, "ativo");

  return repository.update(id, alteracoes);
}


export async function remove(
  id: number
): Promise<Dentista> {
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
      throw new ConflictError(MENSAGEM_COM_CONSULTAS);
    }

    throw error;
  }
}
