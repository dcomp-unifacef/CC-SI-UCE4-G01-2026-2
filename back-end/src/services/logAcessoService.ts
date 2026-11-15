import * as repository from "../repositories/logAcessoRepository.ts";

import { TipoAcessoPaciente } from "../../generated/prisma/client.ts";

import type { FiltroLogAcessoDto } from "../dto/logAcesso/filtroLogAcessoDto.ts";
import type { ListaLogAcessoRespostaDto } from "../dto/logAcesso/logAcessoRespostaDto.ts";

import { BadRequestError } from "../errors/BadRequestError.ts";

import { limitesDoDia } from "../utils/datas.ts";
import { idDaQuery } from "../utils/validators.ts";


const LIMITE_PADRAO = 100;
const LIMITE_MAXIMO = 500;

const MENSAGEM_DIA = "Data inválida. Use o formato AAAA-MM-DD.";
const MENSAGEM_PERIODO = 'A data inicial não pode ser posterior à data final.';
const MENSAGEM_TIPO =
  'O parâmetro "tipo" é inválido.';
const MENSAGEM_LIMITE =
  `O parâmetro "limite" deve ser um número inteiro de 1 a ${LIMITE_MAXIMO}.`;


function lerDia(query: Record<string, unknown>, campo: string) {
  const valor = query[campo];

  if (valor === undefined) {
    return undefined;
  }

  const limites = limitesDoDia(valor);

  if (limites === null) {
    throw new BadRequestError(MENSAGEM_DIA);
  }

  return limites;
}


function lerLimite(query: Record<string, unknown>): number {
  const valor = query.limite;

  if (valor === undefined) {
    return LIMITE_PADRAO;
  }

  if (typeof valor !== "string" || !/^\d{1,3}$/.test(valor.trim())) {
    throw new BadRequestError(MENSAGEM_LIMITE);
  }

  const limite = Number(valor.trim());

  if (limite < 1 || limite > LIMITE_MAXIMO) {
    throw new BadRequestError(MENSAGEM_LIMITE);
  }

  return limite;
}


export async function consultar(
  query: Record<string, unknown>
): Promise<ListaLogAcessoRespostaDto> {
  const filtro: FiltroLogAcessoDto = { limite: lerLimite(query) };

  const paciente_id = idDaQuery(query, "paciente_id");
  const usuario_id = idDaQuery(query, "usuario_id");
  const antes_do_id = idDaQuery(query, "antes_do_id");

  if (paciente_id !== undefined) filtro.paciente_id = paciente_id;
  if (usuario_id !== undefined) filtro.usuario_id = usuario_id;
  if (antes_do_id !== undefined) filtro.antes_do_id = antes_do_id;

  if (query.tipo !== undefined) {
    const tipos: string[] = Object.values(TipoAcessoPaciente);

    if (typeof query.tipo !== "string" || !tipos.includes(query.tipo)) {
      throw new BadRequestError(MENSAGEM_TIPO);
    }

    filtro.tipo = query.tipo as TipoAcessoPaciente;
  }

  const de = lerDia(query, "de");
  const ate = lerDia(query, "ate");

  if (de) filtro.de = de.inicio;

  if (ate) filtro.ate = new Date(ate.fim.getTime() - 1);

  if (de && ate && de.inicio.getTime() > ate.inicio.getTime()) {
    throw new BadRequestError(MENSAGEM_PERIODO);
  }

  const registros = await repository.findAll(filtro);

  const itens = registros.map((registro) => ({
    id: registro.id,
    tipo: registro.tipo,
    acessado_em: registro.acessado_em,
    usuario: { id: registro.usuario.id, nome: registro.usuario.nome },
    paciente: { id: registro.paciente.id, nome: registro.paciente.nome },
  }));

  return {
    itens,
    proximo_cursor:
      itens.length === filtro.limite ? itens[itens.length - 1]!.id : null,
  };
}
