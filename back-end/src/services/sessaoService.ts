import * as usuarioRepository from "../repositories/usuarioRepository.ts";
import * as sessaoRepository from "../repositories/sessaoRepository.ts";
import * as configuracaoRepository from "../repositories/configuracaoRepository.ts";

import type { LoginDto } from "../dto/sessao/loginDto.ts";
import type { UsuarioAutenticadoDto } from "../dto/sessao/usuarioAutenticadoDto.ts";

import { AppError } from "../errors/AppError.ts";
import { BadRequestError } from "../errors/BadRequestError.ts";
import { UnauthorizedError } from "../errors/UnauthorizedError.ts";

import { normalizarLogin } from "../utils/login.ts";
import { gerarHashSenha, verificarSenha } from "../utils/senha.ts";
import { gerarToken, hashDoToken } from "../utils/token.ts";
import { exigirCorpo } from "../utils/validators.ts";


export interface SessaoIniciada {
  token: string;
  duracaoEmMs: number;
  expira_em: Date;
  usuario: UsuarioAutenticadoDto;
}


export interface SessaoValida {
  id: number;
  expira_em: Date;
  usuario: UsuarioAutenticadoDto;
}


const MENSAGEM_LOGIN =
  "Login ou senha inválidos, ou acesso temporariamente bloqueado.";

const MENSAGEM_SESSAO = "Sessão inválida ou expirada.";

const MENSAGEM_INTERNA = "Erro interno do servidor.";

const TENTATIVAS_MAXIMAS = 3;

const MINUTO_EM_MS = 60 * 1000;

const BLOQUEIO_EM_MS = MINUTO_EM_MS;

const INTERVALO_DE_USO_EM_MS = MINUTO_EM_MS;


const hashFalso = gerarHashSenha("senha-ficticia-para-login-inexistente");

hashFalso.catch(() => undefined);


function paraUsuarioAutenticado(usuario: UsuarioAutenticadoDto): UsuarioAutenticadoDto {
  return {
    id: usuario.id,
    nome: usuario.nome,
    login: usuario.login,
    perfil: usuario.perfil,
  };
}


async function registrarFalha(id: number): Promise<void> {
  const { tentativas_falhas } = await usuarioRepository.registrarFalhaDeLogin(id);

  if (tentativas_falhas >= TENTATIVAS_MAXIMAS) {
    await usuarioRepository.bloquearLogin(
      id,
      new Date(Date.now() + BLOQUEIO_EM_MS)
    );
  }
}


export async function login(data: LoginDto): Promise<SessaoIniciada> {
  const corpo = exigirCorpo(data);
  const loginNormalizado = normalizarLogin(corpo.login);
  const senha = corpo.senha;

  if (typeof senha !== "string" || senha === "") {
    throw new BadRequestError('O campo "senha" é obrigatório.');
  }

  const agora = new Date();
  const credenciais = await usuarioRepository.findCredenciaisByLogin(loginNormalizado);

  const senhaConfere = await verificarSenha(
    senha,
    credenciais?.senha_hash ?? (await hashFalso)
  );

  const bloqueadoAte = credenciais?.bloqueado_ate ?? null;
  const bloqueado = bloqueadoAte !== null && bloqueadoAte > agora;

  if (!credenciais || !credenciais.ativo || bloqueado) {
    throw new UnauthorizedError(MENSAGEM_LOGIN);
  }

  if (!senhaConfere) {
    await registrarFalha(credenciais.id);
    throw new UnauthorizedError(MENSAGEM_LOGIN);
  }

  if (credenciais.tentativas_falhas > 0 || credenciais.bloqueado_ate !== null) {
    await usuarioRepository.zerarFalhasDeLogin(credenciais.id);
  }

  const configuracao = await configuracaoRepository.find();

  if (!configuracao) {
    throw new AppError(MENSAGEM_INTERNA, 500);
  }

  const usuario = await usuarioRepository.findById(credenciais.id);

  if (!usuario) {
    throw new UnauthorizedError(MENSAGEM_LOGIN);
  }

  const duracaoEmMs = configuracao.sessao_duracao_max_min * MINUTO_EM_MS;
  const expira_em = new Date(Date.now() + duracaoEmMs);
  const { token, hash } = gerarToken();

  await sessaoRepository.create({
    token_hash: hash,
    usuario_id: usuario.id,
    expira_em,
  });

  return {
    token,
    duracaoEmMs,
    expira_em,
    usuario: paraUsuarioAutenticado(usuario),
  };
}


export async function logout(token: unknown): Promise<void> {
  if (typeof token !== "string" || token === "") return;

  const sessao = await sessaoRepository.findByTokenHash(hashDoToken(token));

  if (!sessao) return;

  await sessaoRepository.revoke(sessao.id, new Date());
}


export async function validar(token: unknown): Promise<SessaoValida> {
  if (typeof token !== "string" || token === "") {
    throw new UnauthorizedError(MENSAGEM_SESSAO);
  }

  const sessao = await sessaoRepository.findByTokenHash(hashDoToken(token));

  if (!sessao || sessao.revogada_em !== null || !sessao.usuario.ativo) {
    throw new UnauthorizedError(MENSAGEM_SESSAO);
  }

  const configuracao = await configuracaoRepository.find();

  if (!configuracao) {
    throw new AppError(MENSAGEM_INTERNA, 500);
  }

  const agora = new Date();
  const ociosoEmMs = agora.getTime() - sessao.ultimo_uso_em.getTime();

  const vencida =
    agora >= sessao.expira_em ||
    ociosoEmMs > configuracao.sessao_inatividade_min * MINUTO_EM_MS;

  if (vencida) {
    await sessaoRepository.revoke(sessao.id, agora);
    throw new UnauthorizedError(MENSAGEM_SESSAO);
  }

  if (ociosoEmMs > INTERVALO_DE_USO_EM_MS) {
    await sessaoRepository.touch(sessao.id, agora);
  }

  return {
    id: sessao.id,
    expira_em: sessao.expira_em,
    usuario: paraUsuarioAutenticado(sessao.usuario),
  };
}
