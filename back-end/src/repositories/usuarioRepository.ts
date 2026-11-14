import { prisma } from "../database/client.ts";

import type { CreateUsuarioDto }
  from "../dto/usuario/createUsuarioDto.ts";

import type { UpdateUsuarioDto }
  from "../dto/usuario/updateUsuarioDto.ts";

import type { LoginNormalizado } from "../utils/login.ts";


// O hash da senha não sai nas consultas comuns. Somente
// findCredenciaisByLogin() o devolve, para o login (etapa posterior).
const semSenha = { senha_hash: true } as const;


export function findAll() {
  return prisma.usuario.findMany({
    omit: semSenha,
    orderBy: {
      nome: "asc",
    },
  });
}


export function findById(id: number) {
  return prisma.usuario.findUnique({
    where: { id },
    omit: semSenha,
  });
}


// O login chega já normalizado (ver src/utils/login.ts)
export function findByLogin(login: LoginNormalizado) {
  return prisma.usuario.findUnique({
    where: { login },
    omit: semSenha,
  });
}


// Única consulta que devolve senha_hash: destinada à verificação do login.
// O resultado nunca deve ser enviado ao cliente nem registrado em log.
export function findCredenciaisByLogin(login: LoginNormalizado) {
  return prisma.usuario.findUnique({
    where: { login },
    select: {
      id: true,
      login: true,
      senha_hash: true,
      perfil: true,
      ativo: true,
      tentativas_falhas: true,
      bloqueado_ate: true,
    },
  });
}


export function create(data: CreateUsuarioDto) {
  return prisma.usuario.create({
    data,
    omit: semSenha,
  });
}


export function update(
  id: number,
  data: UpdateUsuarioDto
) {
  return prisma.usuario.update({
    where: { id },
    data,
    omit: semSenha,
  });
}


// Não há remove: usuários são desativados (ativo = false), não excluídos.
