import * as repository from "../repositories/contatoRetornoRepository.ts";
import * as pacienteRepository from "../repositories/pacienteRepository.ts";

import {
  Perfil,
  ResultadoContatoRetorno,
} from "../../generated/prisma/client.ts";

import type { UsuarioAutenticado } from "./consultaService.ts";
import type { CadastroContatoRetornoDto } from "../dto/contatoRetorno/cadastroContatoRetornoDto.ts";
import type { ContatoRetornoRespostaDto } from "../dto/contatoRetorno/contatoRetornoRespostaDto.ts";

import { BadRequestError } from "../errors/BadRequestError.ts";
import { NotFoundError } from "../errors/NotFoundError.ts";

import {
  exigirCorpo,
  idDaQuery,
  inteiroObrigatorio,
  textoObrigatorio,
  textoOpcional,
  validarId,
} from "../utils/validators.ts";


type ContatoComUsuario = Awaited<ReturnType<typeof repository.create>>;


const RESULTADOS: string[] = Object.values(ResultadoContatoRetorno);


function podeVerAnotacao(usuario: UsuarioAutenticado): boolean {
  return usuario.perfil === Perfil.DONO || usuario.perfil === Perfil.DENTISTA;
}


function paraResposta(
  contato: ContatoComUsuario,
  incluirAnotacao: boolean
): ContatoRetornoRespostaDto {
  const base: ContatoRetornoRespostaDto = {
    id: contato.id,
    paciente_id: contato.paciente_id,
    resultado: contato.resultado,
    registrado_em: contato.registrado_em,
    usuario: {
      id: contato.usuario.id,
      nome: contato.usuario.nome,
    },
  };

  return incluirAnotacao ? { ...base, anotacao: contato.anotacao } : base;
}


export async function findAll(
  query: Record<string, unknown>,
  usuario: UsuarioAutenticado
): Promise<ContatoRetornoRespostaDto[]> {
  const paciente_id = idDaQuery(query, "paciente_id");

  if (paciente_id === undefined) {
    throw new BadRequestError('Informe "paciente_id".');
  }

  const paciente = await pacienteRepository.findById(paciente_id);

  if (!paciente) {
    throw new NotFoundError("Paciente não encontrado.");
  }

  const contatos = await repository.findByPaciente(paciente_id);
  const incluirAnotacao = podeVerAnotacao(usuario);

  return contatos.map((contato) => paraResposta(contato, incluirAnotacao));
}


export async function create(
  data: CadastroContatoRetornoDto,
  usuario: UsuarioAutenticado
): Promise<ContatoRetornoRespostaDto> {
  const corpo = exigirCorpo(data);

  const paciente_id = inteiroObrigatorio(corpo, "paciente_id");
  validarId(paciente_id);

  const resultado = textoObrigatorio(corpo, "resultado");

  if (!RESULTADOS.includes(resultado)) {
    throw new BadRequestError(
      'O campo "resultado" é inválido. Use SEM_RESPOSTA, AGENDOU ou RECUSOU.'
    );
  }

  const anotacao = textoOpcional(corpo, "anotacao") ?? null;

  const paciente = await pacienteRepository.findById(paciente_id);

  if (!paciente) {
    throw new BadRequestError("Paciente não encontrado.");
  }

  const contato = await repository.create(
    {
      paciente_id,
      resultado: resultado as ResultadoContatoRetorno,
      anotacao,
    },
    usuario.id
  );

  return paraResposta(contato, podeVerAnotacao(usuario));
}
