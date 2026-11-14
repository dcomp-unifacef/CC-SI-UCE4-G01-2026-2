import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

import * as repository from "../src/repositories/sessaoRepository.ts";
import * as usuarioRepository from "../src/repositories/usuarioRepository.ts";
import { prisma } from "../src/database/client.ts";
import { gerarToken } from "../src/utils/token.ts";
import { normalizarLogin } from "../src/utils/login.ts";
import { Perfil } from "../generated/prisma/client.ts";


// Estes testes usam o banco de desenvolvimento, SOMENTE com dados fictícios
// criados por eles mesmos. A limpeza remove apenas os ids criados nesta
// execução (nunca por prefixo ou filtro genérico), sessões primeiro e
// usuários depois. Nenhum teste faz limpeza geral das sessões do banco.
const RODADA = randomBytes(4).toString("hex");
const HASH_FICTICIO = `hash-ficticio-${RODADA}`; // não é senha nem hash real
const HORA = 60 * 60 * 1000;
const DIA = 24 * HORA;

const idsUsuarios: number[] = [];
const idsSessoes: number[] = [];
let contador = 0;


async function criarUsuario() {
  contador += 1;

  const u = await usuarioRepository.create({
    nome: `Usuário fictício ${RODADA}-${contador}`,
    login: normalizarLogin(`sessao.${RODADA}.${contador}`),
    senha_hash: HASH_FICTICIO,
    perfil: Perfil.SECRETARIA,
  });

  idsUsuarios.push(u.id);
  return u;
}


// O token em texto existe só nesta função (memória) e nunca é usado: o
// banco recebe apenas o hash.
async function criarSessao(usuarioId: number, expiraEm = new Date(Date.now() + 8 * HORA)) {
  const { hash } = gerarToken();
  const sessao = await repository.create({ token_hash: hash, usuario_id: usuarioId, expira_em: expiraEm });

  idsSessoes.push(sessao.id);
  return { sessao, hash };
}


// Sessão que já nasce expirada: criada direto, com criada_em no passado
// (o CHECK exige expira_em > criada_em).
async function criarSessaoExpiradaEm(usuarioId: number, expiraEm: Date) {
  const { hash } = gerarToken();
  const sessao = await prisma.sessao.create({
    data: {
      token_hash: hash,
      usuario_id: usuarioId,
      criada_em: new Date(expiraEm.getTime() - 8 * HORA),
      expira_em: expiraEm,
    },
  });

  idsSessoes.push(sessao.id);
  return sessao;
}


async function existe(id: number): Promise<boolean> {
  return (await prisma.sessao.count({ where: { id } })) === 1;
}


// Confere (sem imprimir valores) que o resultado não contém o hash do
// token, a senha nem o hash da senha do usuário.
function semSegredos(resultado: unknown, hashDoToken?: string): boolean {
  const texto = JSON.stringify(resultado);

  return !texto.includes("senha_hash")
    && !texto.includes("token_hash")
    && !texto.includes(HASH_FICTICIO)
    && (hashDoToken === undefined || !texto.includes(hashDoToken));
}


function erroPrisma(codigo: string) {
  return (e: unknown) => typeof e === "object" && e !== null && (e as { code?: string }).code === codigo;
}


// Única forma de limpar sessões expiradas neste arquivo: o usuarioId é
// obrigatório, então nenhum teste consegue fazer uma limpeza geral.
function limparExpiradasDoUsuario(antes: Date, usuarioId: number) {
  return repository.deleteExpiradas(antes, usuarioId);
}


after(async () => {
  if (idsSessoes.length > 0) {
    await prisma.sessao.deleteMany({ where: { id: { in: idsSessoes } } });
  }

  if (idsUsuarios.length > 0) {
    await prisma.usuario.deleteMany({ where: { id: { in: idsUsuarios } } });
  }

  await prisma.$disconnect();
});


describe("Sessao: criação e restrições", () => {
  it("cria com os padrões e sem devolver o hash do token", async () => {
    const u = await criarUsuario();
    const expira = new Date(Date.now() + 8 * HORA);
    const { sessao, hash } = await criarSessao(u.id, expira);

    assert.equal(typeof sessao.id, "number");
    assert.equal(sessao.usuario_id, u.id);
    assert.equal(sessao.expira_em.getTime(), expira.getTime());
    assert.equal(sessao.revogada_em, null);
    assert.ok(sessao.criada_em instanceof Date);
    assert.ok(sessao.ultimo_uso_em instanceof Date);
    assert.ok(semSegredos(sessao, hash), "a resposta de create não pode conter o hash do token");
  });

  it("não aceita o mesmo hash de token duas vezes (P2002)", async () => {
    const u = await criarUsuario();
    const { hash } = await criarSessao(u.id);

    await assert.rejects(
      repository.create({ token_hash: hash, usuario_id: u.id, expira_em: new Date(Date.now() + HORA) }),
      erroPrisma("P2002")
    );
  });

  it("recusa sessão de usuário inexistente (P2003)", async () => {
    await assert.rejects(
      repository.create({ token_hash: gerarToken().hash, usuario_id: 2147483647, expira_em: new Date(Date.now() + HORA) }),
      erroPrisma("P2003")
    );
  });

  it("o CHECK recusa expira_em anterior ou igual a criada_em", async () => {
    const u = await criarUsuario();

    // anterior ao momento da criação (criada_em usa o relógio do banco)
    const passado = gerarToken().hash;

    await assert.rejects(
      repository.create({ token_hash: passado, usuario_id: u.id, expira_em: new Date(Date.now() - 60_000) })
    );
    assert.equal(await prisma.sessao.count({ where: { token_hash: passado } }), 0);

    // igual a criada_em
    const instante = new Date(Date.now() - DIA);
    const igual = gerarToken().hash;

    await assert.rejects(
      prisma.sessao.create({ data: { token_hash: igual, usuario_id: u.id, criada_em: instante, expira_em: instante } })
    );
    assert.equal(await prisma.sessao.count({ where: { token_hash: igual } }), 0);
  });

  it("a exclusão de um usuário exclui as sessões dele (CASCADE do banco)", async () => {
    // A regra da aplicação é desativar usuários; este teste só documenta o
    // comportamento do banco, com um usuário criado pelo próprio teste.
    const u = await criarUsuario();
    const a = await criarSessao(u.id);
    const b = await criarSessao(u.id);

    await prisma.usuario.delete({ where: { id: u.id } });

    assert.equal(await existe(a.sessao.id), false);
    assert.equal(await existe(b.sessao.id), false);
  });
});


describe("Sessao: consulta por hash", () => {
  it("devolve a sessão com o usuário mínimo e sem segredos", async () => {
    const u = await criarUsuario();
    const { sessao, hash } = await criarSessao(u.id);

    const achada = await repository.findByTokenHash(hash);

    assert.ok(achada !== null, "a sessão deve ser encontrada");
    assert.equal(achada.id, sessao.id);
    assert.equal(achada.usuario.id, u.id);
    assert.deepEqual(Object.keys(achada.usuario).sort(), ["ativo", "id", "login", "nome", "perfil"]);
    assert.ok(semSegredos(achada, hash), "a consulta não pode conter senha_hash nem o hash do token");
  });

  it("devolve null para hash desconhecido", async () => {
    assert.equal(await repository.findByTokenHash(gerarToken().hash), null);
  });
});


describe("Sessao: último uso e revogação", () => {
  it("touch atualiza o último uso e informa quantas sessões atualizou", async () => {
    const u = await criarUsuario();
    const { sessao, hash } = await criarSessao(u.id);
    const quando = new Date(Date.now() + 1234);

    assert.equal((await repository.touch(sessao.id, quando)).count, 1);
    assert.equal((await repository.findByTokenHash(hash))?.ultimo_uso_em.getTime(), quando.getTime());
    assert.equal((await repository.touch(2147483647, quando)).count, 0);
  });

  it("revoke revoga só a sessão indicada e é idempotente", async () => {
    const u = await criarUsuario();
    const a = await criarSessao(u.id);
    const b = await criarSessao(u.id);
    const quando = new Date(Date.now());
    const depois = new Date(Date.now() + 60_000);

    assert.equal((await repository.revoke(a.sessao.id, quando)).count, 1);

    const ra = await prisma.sessao.findUnique({ where: { id: a.sessao.id } });
    const rb = await prisma.sessao.findUnique({ where: { id: b.sessao.id } });

    assert.equal(ra?.revogada_em?.getTime(), quando.getTime());
    assert.equal(rb?.revogada_em, null);

    // revogar de novo não altera nada nem a data
    assert.equal((await repository.revoke(a.sessao.id, depois)).count, 0);
    assert.equal((await prisma.sessao.findUnique({ where: { id: a.sessao.id } }))?.revogada_em?.getTime(), quando.getTime());
  });

  it("revokeAllByUsuario revoga só as sessões ainda ativas daquele usuário", async () => {
    const a = await criarUsuario();
    const b = await criarUsuario();
    const a1 = await criarSessao(a.id);
    const a2 = await criarSessao(a.id);
    const a3 = await criarSessao(a.id);
    const b1 = await criarSessao(b.id);
    const antiga = new Date(Date.now() - HORA);
    const agora = new Date(Date.now());

    await repository.revoke(a3.sessao.id, antiga);

    assert.equal((await repository.revokeAllByUsuario(a.id, agora)).count, 2);

    const lidas = await prisma.sessao.findMany({
      where: { id: { in: [a1.sessao.id, a2.sessao.id, a3.sessao.id, b1.sessao.id] } },
      select: { id: true, revogada_em: true },
    });
    const dataDe = (id: number) => lidas.find((s) => s.id === id)?.revogada_em;

    assert.equal(dataDe(a1.sessao.id)?.getTime(), agora.getTime());
    assert.equal(dataDe(a2.sessao.id)?.getTime(), agora.getTime());
    assert.equal(dataDe(a3.sessao.id)?.getTime(), antiga.getTime());
    assert.equal(dataDe(b1.sessao.id), null);
  });
});


describe("Sessao: limpeza de expiradas (somente registros fictícios do teste)", () => {
  it("remove só as expiradas antes do corte, do usuário informado, e preserva todo o resto", async () => {
    const u = await criarUsuario();
    const outro = await criarUsuario();

    // Corte fixo: 30 dias antes de agora. "Expirada" é estritamente anterior ao corte.
    const corte = new Date(Date.now() - 30 * DIA);

    const expiradaAntes = await criarSessaoExpiradaEm(u.id, new Date(corte.getTime() - 1000)); // removida
    const noCorte = await criarSessaoExpiradaEm(u.id, new Date(corte.getTime())); // mantida (não é anterior)
    const recente = await criarSessaoExpiradaEm(u.id, new Date(corte.getTime() + DIA)); // mantida (expirou há menos de 30 dias)
    const ativa = await criarSessao(u.id); // mantida
    const revogada = await criarSessao(u.id); // mantida (ainda não expirou)
    await repository.revoke(revogada.sessao.id, new Date());
    const doOutro = await criarSessaoExpiradaEm(outro.id, new Date(corte.getTime() - DIA)); // de outro usuário: mantida

    // conferência prévia (sem apagar nada)
    assert.equal(await repository.countExpiradas(corte, u.id), 1);
    assert.equal(await repository.countExpiradas(corte, outro.id), 1);

    const r = await limparExpiradasDoUsuario(corte, u.id);

    assert.equal(r.count, 1);
    assert.equal(await existe(expiradaAntes.id), false);
    assert.equal(await existe(noCorte.id), true);
    assert.equal(await existe(recente.id), true);
    assert.equal(await existe(ativa.sessao.id), true);
    assert.equal(await existe(revogada.sessao.id), true);
    assert.equal(await existe(doOutro.id), true, "a sessão expirada de outro usuário não pode ser afetada");

    // segunda execução: nada mais a remover
    assert.equal((await limparExpiradasDoUsuario(corte, u.id)).count, 0);
    assert.equal(await repository.countExpiradas(corte, u.id), 0);
  });
});
