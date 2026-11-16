import { prisma } from "../database/client.ts";

import type { CreateUsuarioDto }
  from "../dto/usuario/createUsuarioDto.ts";

import type { UpdateUsuarioDto }
  from "../dto/usuario/updateUsuarioDto.ts";

import type { CreateSessaoDto }
  from "../dto/sessao/createSessaoDto.ts";

import type { LoginNormalizado } from "../utils/login.ts";

import { Perfil } from "../../generated/prisma/client.ts";
import type { Usuario } from "../../generated/prisma/client.ts";
import { BLOQUEIO_CONFIGURACAO, BLOQUEIO_DONOS } from "../database/bloqueios.ts";


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


export function findByLogin(login: LoginNormalizado) {
  return prisma.usuario.findUnique({
    where: { login },
    omit: semSenha,
  });
}


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


export function contarUsuarios() {
  return prisma.usuario.count();
}


export function criarPrimeiroDono(data: Omit<CreateUsuarioDto, "perfil">) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 AS bloqueado FROM (SELECT pg_advisory_xact_lock(${BLOQUEIO_DONOS}::bigint)) AS trava`;

    if (await tx.usuario.count() > 0) {
      return null;
    }

    return tx.usuario.create({
      data: { ...data, perfil: Perfil.DONO },
      omit: semSenha,
    });
  });
}


export function liberarBloqueioVencido(id: number, agora: Date) {
  return prisma.usuario.updateMany({
    where: { id, bloqueado_ate: { lte: agora } },
    data: { tentativas_falhas: 0, bloqueado_ate: null },
  });
}


export async function reservarTentativaDeLogin(
  id: number,
  maximo: number
): Promise<boolean> {
  const { count } = await prisma.usuario.updateMany({
    where: { id, bloqueado_ate: null, tentativas_falhas: { lt: maximo } },
    data: { tentativas_falhas: { increment: 1 } },
  });

  return count === 1;
}


export function bloquearSeTentativasEsgotadas(
  id: number,
  maximo: number,
  ate: Date
) {
  return prisma.usuario.updateMany({
    where: { id, bloqueado_ate: null, tentativas_falhas: { gte: maximo } },
    data: { bloqueado_ate: ate },
  });
}


export type ResultadoDoLogin =
  | { situacao: "concluido"; expira_em: Date; duracaoEmMs: number }
  | { situacao: "recusado" }
  | { situacao: "sem_configuracao" };


export function concluirLogin(
  id: number,
  senhaHashConferido: string,
  token_hash: string
) {
  return prisma.$transaction(
    async (tx): Promise<ResultadoDoLogin> => {
      await tx.$queryRaw`SELECT 1 AS bloqueado FROM (SELECT pg_advisory_xact_lock(${BLOQUEIO_CONFIGURACAO}::bigint)) AS trava`;

      const configuracao = await tx.configuracao.findUnique({
        where: { id: 1 },
      });

      if (!configuracao) {
        return { situacao: "sem_configuracao" };
      }

      const { count } = await tx.usuario.updateMany({
        where: { id, ativo: true, senha_hash: senhaHashConferido },
        data: { tentativas_falhas: 0, bloqueado_ate: null },
      });

      if (count !== 1) {
        return { situacao: "recusado" };
      }

      const duracaoEmMs = configuracao.sessao_duracao_max_min * 60 * 1000;
      const expira_em = new Date(Date.now() + duracaoEmMs);

      await tx.sessao.create({
        data: { token_hash, usuario_id: id, expira_em },
        omit: { token_hash: true },
      });

      return { situacao: "concluido", expira_em, duracaoEmMs };
    },
    { maxWait: 10_000, timeout: 20_000 }
  );
}


export type ResultadoDaAtualizacao =
  | { situacao: "atualizado"; usuario: Omit<Usuario, "senha_hash"> }
  | { situacao: "nao_encontrado" }
  | { situacao: "ultimo_dono" };


export function atualizarRespeitandoUltimoDono(
  id: number,
  data: { nome?: string; perfil?: Perfil; ativo?: boolean },
  quando: Date
) {
  return prisma.$transaction(async (tx): Promise<ResultadoDaAtualizacao> => {
    await tx.$queryRaw`SELECT 1 AS bloqueado FROM (SELECT pg_advisory_xact_lock(${BLOQUEIO_DONOS}::bigint)) AS trava`;

    const atual = await tx.usuario.findUnique({
      where: { id },
      select: { perfil: true, ativo: true },
    });

    if (!atual) {
      return { situacao: "nao_encontrado" };
    }

    const deixaDeSerDonoAtivo =
      atual.perfil === Perfil.DONO &&
      atual.ativo &&
      (data.ativo === false ||
        (data.perfil !== undefined && data.perfil !== Perfil.DONO));

    if (deixaDeSerDonoAtivo) {
      const outrosDonos = await tx.usuario.count({
        where: { perfil: Perfil.DONO, ativo: true, id: { not: id } },
      });

      if (outrosDonos === 0) {
        return { situacao: "ultimo_dono" };
      }
    }

    const reativando = data.ativo === true && !atual.ativo;

    const usuario = await tx.usuario.update({
      where: { id },
      data: {
        ...data,
        ...(reativando ? { tentativas_falhas: 0, bloqueado_ate: null } : {}),
      },
      omit: semSenha,
    });

    if (data.ativo === false) {
      await tx.sessao.updateMany({
        where: { usuario_id: id, revogada_em: null },
        data: { revogada_em: quando },
      });
    }

    return { situacao: "atualizado", usuario };
  });
}


export function alterarSenhaERevogarSessoes(
  id: number,
  senha_hash: string,
  quando: Date,
  senhaHashEsperado?: string
) {
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.usuario.updateMany({
      where: senhaHashEsperado === undefined
        ? { id }
        : { id, senha_hash: senhaHashEsperado },
      data: { senha_hash, tentativas_falhas: 0, bloqueado_ate: null },
    });

    if (count !== 1) {
      return false;
    }

    await tx.sessao.updateMany({
      where: { usuario_id: id, revogada_em: null },
      data: { revogada_em: quando },
    });

    return true;
  });
}


