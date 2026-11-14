import * as repository from "../repositories/usuarioRepository.ts";
import * as sessaoService from "./sessaoService.ts";

import { Perfil } from "../../generated/prisma/client.ts";
import type { Usuario } from "../../generated/prisma/client.ts";
import type { AlteracaoUsuarioDto } from "../dto/usuario/alteracaoUsuarioDto.ts";
import type { CadastroUsuarioDto } from "../dto/usuario/cadastroUsuarioDto.ts";
import type { RedefinicaoSenhaDto } from "../dto/usuario/redefinicaoSenhaDto.ts";
import type { TrocaSenhaDto } from "../dto/usuario/trocaSenhaDto.ts";
import type { UsuarioAutenticadoDto } from "../dto/sessao/usuarioAutenticadoDto.ts";
import type { UsuarioRespostaDto } from "../dto/usuario/usuarioRespostaDto.ts";

import { BadRequestError } from "../errors/BadRequestError.ts";
import { ConflictError } from "../errors/ConflictError.ts";
import { ForbiddenError } from "../errors/ForbiddenError.ts";
import { NotFoundError } from "../errors/NotFoundError.ts";

import { normalizarLogin } from "../utils/login.ts";
import { gerarHashSenha, validarSenha } from "../utils/senha.ts";

import {
  booleanoOpcional,
  erroPrisma,
  exigirCorpo,
  textoObrigatorio,
  validarId,
} from "../utils/validators.ts";


const MENSAGEM_NAO_ENCONTRADO = "Usuário não encontrado.";

const MENSAGEM_LOGIN_DUPLICADO = "Já existe um usuário com este login.";

const MENSAGEM_ULTIMO_DONO =
  "Não é possível desativar ou rebaixar o último dono ativo.";

const MENSAGEM_SENHA_ATUAL =
  "Senha atual inválida, ou acesso temporariamente bloqueado.";

const MENSAGEM_PROPRIA_SENHA =
  "Para alterar a própria senha, informe a senha atual na troca de senha.";

const MENSAGEM_SENHA_ALTERADA =
  "A senha foi alterada por outra operação. Entre novamente.";


function paraResposta(usuario: Omit<Usuario, "senha_hash">): UsuarioRespostaDto {
  return {
    id: usuario.id,
    nome: usuario.nome,
    login: usuario.login,
    perfil: usuario.perfil,
    ativo: usuario.ativo,
    criado_em: usuario.criado_em,
    atualizado_em: usuario.atualizado_em,
  };
}


function perfilValido(valor: unknown): Perfil {
  if (
    typeof valor !== "string" ||
    !(Object.values(Perfil) as string[]).includes(valor)
  ) {
    throw new BadRequestError('O campo "perfil" é inválido.');
  }

  return valor as Perfil;
}


export async function findAll(): Promise<UsuarioRespostaDto[]> {
  const usuarios = await repository.findAll();

  return usuarios.map(paraResposta);
}


export async function findById(id: number): Promise<UsuarioRespostaDto> {
  validarId(id);

  const usuario = await repository.findById(id);

  if (!usuario) {
    throw new NotFoundError(MENSAGEM_NAO_ENCONTRADO);
  }

  return paraResposta(usuario);
}


export async function create(
  data: CadastroUsuarioDto
): Promise<UsuarioRespostaDto> {
  const corpo = exigirCorpo(data);

  const nome = textoObrigatorio(corpo, "nome");
  const login = normalizarLogin(corpo.login);
  const senha = validarSenha(corpo.senha);
  const perfil = perfilValido(corpo.perfil);

  if (await repository.findByLogin(login)) {
    throw new ConflictError(MENSAGEM_LOGIN_DUPLICADO);
  }

  const senha_hash = await gerarHashSenha(senha);

  try {
    const usuario = await repository.create({ nome, login, senha_hash, perfil });

    return paraResposta(usuario);
  }
  catch (error) {
    if (erroPrisma(error, "P2002")) {
      throw new ConflictError(MENSAGEM_LOGIN_DUPLICADO);
    }

    throw error;
  }
}


export async function update(
  id: number,
  data: AlteracaoUsuarioDto
): Promise<UsuarioRespostaDto> {
  validarId(id);

  const corpo = exigirCorpo(data);

  if (corpo.login !== undefined) {
    throw new BadRequestError("O login não pode ser alterado.");
  }

  if (corpo.senha !== undefined) {
    throw new BadRequestError("A senha deve ser alterada na rota de senha.");
  }

  const alteracoes: { nome?: string; perfil?: Perfil; ativo?: boolean } = {};

  if (corpo.nome !== undefined) {
    alteracoes.nome = textoObrigatorio(corpo, "nome");
  }

  if (corpo.perfil !== undefined) {
    alteracoes.perfil = perfilValido(corpo.perfil);
  }

  const ativo = booleanoOpcional(corpo, "ativo");

  if (ativo !== undefined) {
    alteracoes.ativo = ativo;
  }

  if (Object.keys(alteracoes).length === 0) {
    return findById(id);
  }

  const resultado = await repository.atualizarRespeitandoUltimoDono(
    id,
    alteracoes,
    new Date()
  );

  if (resultado.situacao === "nao_encontrado") {
    throw new NotFoundError(MENSAGEM_NAO_ENCONTRADO);
  }

  if (resultado.situacao === "ultimo_dono") {
    throw new ConflictError(MENSAGEM_ULTIMO_DONO);
  }

  return paraResposta(resultado.usuario);
}


export async function redefinirSenha(
  id: number,
  data: RedefinicaoSenhaDto,
  atorId: number
): Promise<void> {
  validarId(id);

  if (id === atorId) {
    throw new BadRequestError(MENSAGEM_PROPRIA_SENHA);
  }

  const corpo = exigirCorpo(data);
  const senha = validarSenha(corpo.senha);

  await findById(id);

  const senha_hash = await gerarHashSenha(senha);

  const alterada = await repository.alterarSenhaERevogarSessoes(
    id,
    senha_hash,
    new Date()
  );

  if (!alterada) {
    throw new NotFoundError(MENSAGEM_NAO_ENCONTRADO);
  }
}


export async function trocarPropriaSenha(
  usuario: UsuarioAutenticadoDto,
  data: TrocaSenhaDto
): Promise<void> {
  const corpo = exigirCorpo(data);
  const senhaAtual = corpo.senha_atual;

  if (typeof senhaAtual !== "string" || senhaAtual === "") {
    throw new BadRequestError('O campo "senha_atual" é obrigatório.');
  }

  const senhaNova = validarSenha(corpo.senha);

  if (senhaNova === senhaAtual) {
    throw new BadRequestError("A nova senha deve ser diferente da senha atual.");
  }

  const hashConferido = await sessaoService.conferirSenhaAtual(
    usuario.login,
    senhaAtual
  );

  if (hashConferido === null) {
    throw new ForbiddenError(MENSAGEM_SENHA_ATUAL);
  }

  const senha_hash = await gerarHashSenha(senhaNova);

  const alterada = await repository.alterarSenhaERevogarSessoes(
    usuario.id,
    senha_hash,
    new Date(),
    hashConferido
  );

  if (!alterada) {
    throw new ConflictError(MENSAGEM_SENHA_ALTERADA);
  }
}
