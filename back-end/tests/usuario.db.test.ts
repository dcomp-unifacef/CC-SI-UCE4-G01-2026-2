import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

import * as repository from "../src/repositories/usuarioRepository.ts";
import { prisma } from "../src/database/client.ts";
import { normalizarLogin } from "../src/utils/login.ts";
import type { LoginNormalizado } from "../src/utils/login.ts";
import type { CreateUsuarioDto } from "../src/dto/usuario/createUsuarioDto.ts";
import { Perfil } from "../generated/prisma/client.ts";


const RODADA = randomBytes(4).toString("hex");
const HASH_FICTICIO = `hash-ficticio-${RODADA}`;

const idsCriados: number[] = [];
let contador = 0;


function dados(extra: Partial<CreateUsuarioDto> = {}): CreateUsuarioDto {
  contador += 1;

  return {
    nome: `Usuário fictício ${RODADA}-${contador}`,
    login: normalizarLogin(`  Fulano.${RODADA}.${contador}  `),
    senha_hash: HASH_FICTICIO,
    perfil: Perfil.SECRETARIA,
    ...extra,
  };
}


async function criar(extra: Partial<CreateUsuarioDto> = {}) {
  const usuario = await repository.create(dados(extra));
  idsCriados.push(usuario.id);
  return usuario;
}


function semHash(resultado: unknown): boolean {
  const texto = JSON.stringify(resultado);

  return !texto.includes("senha_hash") && !texto.includes(HASH_FICTICIO);
}


function erroPrisma(codigo: string) {
  return (e: unknown) => typeof e === "object" && e !== null && (e as { code?: string }).code === codigo;
}


after(async () => {
  if (idsCriados.length > 0) {
    await prisma.usuario.deleteMany({ where: { id: { in: idsCriados } } });
  }

  await prisma.$disconnect();
});


describe("Usuario: criação", () => {
  it("cria com os padrões e sem devolver o hash", async () => {
    const u = await criar();

    assert.equal(typeof u.id, "number");
    assert.equal(u.ativo, true);
    assert.equal(u.tentativas_falhas, 0);
    assert.equal(u.bloqueado_ate, null);
    assert.equal(u.perfil, Perfil.SECRETARIA);
    assert.ok(u.criado_em instanceof Date);
    assert.ok(u.atualizado_em instanceof Date);
    assert.ok(semHash(u), "a resposta de create não pode conter o hash");
  });

  it("aceita os três perfis", async () => {
    for (const perfil of [Perfil.SECRETARIA, Perfil.DENTISTA, Perfil.DONO]) {
      const u = await criar({ perfil });

      assert.equal(u.perfil, perfil);
    }
  });

  it("grava o login exatamente como recebe: a normalização é do service, não do repository", async () => {
    const crua = `Raw-Case-${RODADA}` as unknown as LoginNormalizado;

    const u = await criar({ login: crua });
    const gravado = await prisma.usuario.findUnique({ where: { id: u.id }, select: { login: true } });

    assert.equal(gravado?.login, `Raw-Case-${RODADA}`);
  });

  it("recusa perfil inválido e nome ausente", async () => {
    await assert.rejects(
      repository.create(dados({ perfil: "INEXISTENTE" as unknown as Perfil })),
    );

    const semNome = dados() as Partial<CreateUsuarioDto>;
    delete semNome.nome;

    await assert.rejects(repository.create(semNome as CreateUsuarioDto));
  });
});


describe("Usuario: normalização e unicidade do login (comportamento da aplicação)", () => {
  it("o mesmo login normalizado não pode ser gravado duas vezes", async () => {
    const base = `ana.${RODADA}`;
    const original = await criar({ login: normalizarLogin(`  ${base.toUpperCase()}  `) });

    assert.equal(original.login, base);

    for (const variacao of [`  ${base.toUpperCase()}  `, base, `\t${base}\n`, base.toUpperCase(), `  ${base}`]) {
      await assert.rejects(
        repository.create(dados({ login: normalizarLogin(variacao) })),
        erroPrisma("P2002"),
        JSON.stringify(variacao)
      );
    }
  });

  it("logins realmente diferentes são aceitos (espaço interno e acento não são equiparados)", async () => {
    const a = await criar({ login: normalizarLogin(`maria silva ${RODADA}`) });
    const b = await criar({ login: normalizarLogin(`mariasilva ${RODADA}`) });
    const c = await criar({ login: normalizarLogin(`  JOSÉ.${RODADA}  `) });
    const d = await criar({ login: normalizarLogin(`jose.${RODADA}`) });

    assert.equal(new Set([a.id, b.id, c.id, d.id]).size, 4);
    assert.equal(c.login, `josé.${RODADA}`);
  });

  it("a busca usa a mesma normalização e encontra o mesmo usuário", async () => {
    const base = `busca.${RODADA}`;
    const u = await criar({ login: normalizarLogin(`  ${base.toUpperCase()}  `) });

    for (const variacao of [base, base.toUpperCase(), `  ${base}  `, `\t${base.toUpperCase()}\n`]) {
      const achado = await repository.findByLogin(normalizarLogin(variacao));

      assert.equal(achado?.id, u.id, JSON.stringify(variacao));

      const cred = await repository.findCredenciaisByLogin(normalizarLogin(variacao));

      assert.equal(cred?.id, u.id, JSON.stringify(variacao));
    }
  });

  it("login inexistente retorna null", async () => {
    assert.equal(await repository.findByLogin(normalizarLogin(`nao-existe.${RODADA}`)), null);
    assert.equal(await repository.findCredenciaisByLogin(normalizarLogin(`nao-existe.${RODADA}`)), null);
  });
});


describe("Usuario: senha_hash fora das respostas comuns", () => {
  it("findAll, findById, findByLogin, create e update não devolvem o hash", async () => {
    const u = await criar();

    assert.ok(semHash(u), "create");
    assert.ok(semHash(await repository.findById(u.id)), "findById");
    assert.ok(semHash(await repository.findByLogin(u.login as LoginNormalizado)), "findByLogin");
    assert.ok(semHash(await repository.findAll()), "findAll");
    assert.ok(semHash(await repository.update(u.id, { nome: `Alterado ${RODADA}` })), "update");
  });

  it("somente findCredenciaisByLogin devolve o hash, para o login", async () => {
    const u = await criar();
    const cred = await repository.findCredenciaisByLogin(u.login as LoginNormalizado);

    assert.ok(cred !== null, "o usuário deve ser encontrado");
    assert.ok(cred.senha_hash === HASH_FICTICIO, "o hash deve ser o que foi gravado");
    assert.equal(cred.id, u.id);
    assert.equal(cred.perfil, u.perfil);
    assert.equal(cred.ativo, true);
    assert.equal(cred.tentativas_falhas, 0);
  });

  it("atualizar o hash funciona e a resposta do update continua sem ele", async () => {
    const u = await criar();
    const novo = `hash-ficticio-novo-${RODADA}`;
    const resposta = await repository.update(u.id, { senha_hash: novo });
    const cred = await repository.findCredenciaisByLogin(u.login as LoginNormalizado);

    assert.ok(!JSON.stringify(resposta).includes(novo) && !JSON.stringify(resposta).includes("senha_hash"), "update não devolve o hash");
    assert.ok(cred?.senha_hash === novo, "o hash novo deve estar gravado");
  });
});


describe("Usuario: atualização e desativação", () => {
  it("atualiza parcialmente sem alterar o restante", async () => {
    const u = await criar();
    const bloqueio = new Date(Date.now() + 60_000);

    const r = await repository.update(u.id, {
      nome: `Novo nome ${RODADA}`,
      perfil: Perfil.DENTISTA,
      tentativas_falhas: 3,
      bloqueado_ate: bloqueio,
    });

    assert.equal(r.nome, `Novo nome ${RODADA}`);
    assert.equal(r.perfil, Perfil.DENTISTA);
    assert.equal(r.tentativas_falhas, 3);
    assert.equal(r.bloqueado_ate?.getTime(), bloqueio.getTime());
    assert.equal(r.login, u.login);
    assert.equal(r.ativo, true);
    assert.ok(r.atualizado_em.getTime() >= u.atualizado_em.getTime());

    const limpo = await repository.update(u.id, { tentativas_falhas: 0, bloqueado_ate: null });

    assert.equal(limpo.tentativas_falhas, 0);
    assert.equal(limpo.bloqueado_ate, null);
  });

  it("desativa em vez de excluir: o registro continua existindo", async () => {
    const u = await criar();

    const r = await repository.update(u.id, { ativo: false });

    assert.equal(r.ativo, false);
    assert.equal((await repository.findById(u.id))?.ativo, false);
  });

  it("o repository não oferece exclusão física", () => {
    assert.equal("remove" in repository, false);
  });

  it("atualizar usuário inexistente falha (P2025) e buscar por id inexistente retorna null", async () => {
    await assert.rejects(repository.update(2147483647, { nome: "x" }), erroPrisma("P2025"));
    assert.equal(await repository.findById(2147483647), null);
  });

  it("findAll lista em ordem alfabética de nome", async () => {
    const z = await criar({ nome: `Zeta ${RODADA}` });
    const a = await criar({ nome: `Alfa ${RODADA}` });
    const lista = await repository.findAll();
    const posicoes = (id: number) => lista.findIndex((x) => x.id === id);

    assert.ok(posicoes(a.id) >= 0 && posicoes(z.id) >= 0);
    assert.ok(posicoes(a.id) < posicoes(z.id));
  });
});
