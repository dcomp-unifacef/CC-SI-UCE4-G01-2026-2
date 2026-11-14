import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { randomBytes, randomInt } from "node:crypto";

import app from "../src/app.ts";
import { prisma } from "../src/database/client.ts";


// Estes testes usam o banco de desenvolvimento, SOMENTE com dados fictícios
// criados por eles mesmos. O prefixo "[TESTE]" serve apenas para identificar
// os dados a olho nu: NUNCA é usado para apagar. A limpeza remove somente os
// ids registrados pela execução atual (ver "criados" e limparCriados()).
const MARCA = "[TESTE]";
const RODADA = randomBytes(4).toString("hex");

let server: Server;
let base = "";


// Ids dos registros criados por ESTA execução (preenchidos pelo chamar())
const criados = {
  visitas: new Set<number>(),
  pacientes: new Set<number>(),
  dentistas: new Set<number>(),
};


type Resposta = { status: number; body: any; headers: Headers };


async function chamar(
  metodo: string,
  caminho: string,
  corpo?: unknown,
  cabecalhos: Record<string, string> = {}
): Promise<Resposta> {
  const resposta = await fetch(base + caminho, {
    method: metodo,
    headers: corpo === undefined ? cabecalhos : { "Content-Type": "application/json", ...cabecalhos },
    body: corpo === undefined ? undefined : typeof corpo === "string" ? corpo : JSON.stringify(corpo),
  });

  const texto = await resposta.text();
  const corpoResposta = texto ? JSON.parse(texto) : null;

  // Registra o id de tudo o que ESTA execução criou, para a limpeza
  if (metodo === "POST" && resposta.status === 201 && typeof corpoResposta?.id === "number") {
    if (caminho === "/pacientes") criados.pacientes.add(corpoResposta.id);
    else if (caminho === "/dentistas") criados.dentistas.add(corpoResposta.id);
    else if (caminho === "/historico-visitas" || caminho === "/historico-visitas/antigos") criados.visitas.add(corpoResposta.id);
  }

  return {
    status: resposta.status,
    body: corpoResposta,
    headers: resposta.headers,
  };
}


// Semente aleatória por execução: os CPFs fictícios mudam a cada execução,
// para não colidir com dados de outras execuções ou de outras pessoas.
const SEMENTE_CPF = randomInt(0, 800000);


// Gera um CPF válido e fictício a partir de um número (base de 9 dígitos)
function cpfFicticio(n: number): string {
  let numero = 100000000 + ((SEMENTE_CPF * 1000 + n) * 7919) % 800000000;
  while (/^(\d)\1{8}$/.test(String(numero))) numero += 1; // evita 9 dígitos iguais
  const base9 = String(numero);
  const digito = (txt: string, pesoInicial: number) => {
    let soma = 0;
    let peso = pesoInicial;
    for (const c of txt) { soma += Number(c) * peso; peso -= 1; }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  const d1 = digito(base9, 10);
  const d2 = digito(base9 + d1, 11);
  return base9 + d1 + d2;
}


let contadorCpf = 1;

function novoPaciente(extra: Record<string, unknown> = {}) {
  contadorCpf += 1;

  return {
    nome: `${MARCA} Paciente ${contadorCpf}`,
    cpf: cpfFicticio(contadorCpf),
    data_nascimento: "1965-03-10T00:00:00.000Z",
    telefone: "16991234567",
    ...extra,
  };
}


async function criarPaciente(extra: Record<string, unknown> = {}) {
  const r = await chamar("POST", "/pacientes", novoPaciente(extra));
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body;
}


async function criarDentista(nome = `${MARCA} Dra. Helena`) {
  const r = await chamar("POST", "/dentistas", { nome });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body;
}


// Remove SOMENTE os registros cujos ids foram criados por esta execução,
// na ordem das chaves estrangeiras: visitas, depois pacientes, depois dentistas.
// Não há filtro por nome nem por prefixo.
async function limparCriados() {
  const visitas = [...criados.visitas];
  const pacientes = [...criados.pacientes];
  const dentistas = [...criados.dentistas];

  if (visitas.length > 0) await prisma.historicoVisita.deleteMany({ where: { id: { in: visitas } } });
  if (pacientes.length > 0) await prisma.paciente.deleteMany({ where: { id: { in: pacientes } } });
  if (dentistas.length > 0) await prisma.dentista.deleteMany({ where: { id: { in: dentistas } } });

  criados.visitas.clear();
  criados.pacientes.clear();
  criados.dentistas.clear();
}


before(async () => {
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});


after(async () => {
  await limparCriados();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await prisma.$disconnect();
});


describe("Paciente", () => {
  it("cria paciente: CPF com pontuação vira só números e a UF vira maiúscula (201)", async () => {
    const puro = cpfFicticio(7001);
    const pontuado = `${puro.slice(0, 3)}.${puro.slice(3, 6)}.${puro.slice(6, 9)}-${puro.slice(9)}`;
    const dados = novoPaciente({
      cpf: pontuado, logradouro: "Rua das Acácias", numero: "145",
      bairro: "Jardim América", municipio: "Franca", uf: "sp",
    });
    const r = await chamar("POST", "/pacientes", dados);

    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.cpf, puro);
    assert.equal(r.body.uf, "SP");
    assert.equal(r.body.ativo, true);
    assert.ok(r.body.id);
  });

  it("recusa o mesmo CPF uma segunda vez (409)", async () => {
    const existente = await criarPaciente();
    const r = await chamar("POST", "/pacientes", novoPaciente({ cpf: existente.cpf }));

    assert.equal(r.status, 409);
    assert.equal(r.body.message, "Já existe um paciente cadastrado com este CPF.");
  });

  it("recusa CPF inválido (400)", async () => {
    const r = await chamar("POST", "/pacientes", novoPaciente({ cpf: "529.982.247-24" }));

    assert.equal(r.status, 400);
    assert.equal(r.body.message, "CPF inválido.");
  });

  it("exige nome, CPF, data de nascimento e telefone (400)", async () => {
    for (const campo of ["nome", "cpf", "data_nascimento", "telefone"]) {
      const dados: Record<string, unknown> = novoPaciente();
      delete dados[campo];

      const r = await chamar("POST", "/pacientes", dados);

      assert.equal(r.status, 400, `sem ${campo}`);
      assert.match(r.body.message, new RegExp(`"${campo}" é obrigatório`));
    }
  });

  it("recusa data de nascimento futura ou inválida (400)", async () => {
    for (const valor of ["2999-01-01T00:00:00.000Z", "2026-13-45", "ontem"]) {
      const r = await chamar("POST", "/pacientes", novoPaciente({ data_nascimento: valor }));

      assert.equal(r.status, 400, valor);
      assert.equal(r.body.message, "Data de nascimento inválida.");
    }
  });

  it("recusa UF que não tem 2 letras (400)", async () => {
    for (const uf of ["S", "SPP", "12"]) {
      const r = await chamar("POST", "/pacientes", novoPaciente({ uf }));

      assert.equal(r.status, 400, uf);
      assert.equal(r.body.message, "UF deve conter 2 letras.");
    }
  });

  it("aceita cadastro sem endereço nem e-mail (201)", async () => {
    const r = await chamar("POST", "/pacientes", novoPaciente());

    assert.equal(r.status, 201);
    assert.equal(r.body.logradouro, null);
    assert.equal(r.body.uf, null);
    assert.equal(r.body.email, null);
  });

  it("recusa e-mail com formato inválido (400)", async () => {
    const r = await chamar("POST", "/pacientes", novoPaciente({ email: "sem-arroba" }));

    assert.equal(r.status, 400);
    assert.equal(r.body.message, "E-mail inválido.");
  });

  it("aceita telefone e e-mail compartilhados entre pacientes (201)", async () => {
    const contato = { telefone: "16990000000", email: "familia@example.com" };

    const a = await chamar("POST", "/pacientes", novoPaciente(contato));
    const b = await chamar("POST", "/pacientes", novoPaciente(contato));

    assert.equal(a.status, 201);
    assert.equal(b.status, 201);
  });

  it("ignora campos que o cliente não pode definir, como id e ativo (201)", async () => {
    const r = await chamar("POST", "/pacientes", novoPaciente({ id: 1, ativo: false }));

    assert.equal(r.status, 201);
    assert.equal(r.body.ativo, true);
    assert.notEqual(r.body.id, 1);
  });

  it("lista e busca por id (200) e responde 404 se não existir", async () => {
    const p = await criarPaciente();

    const lista = await chamar("GET", "/pacientes");
    assert.equal(lista.status, 200);
    assert.ok(lista.body.some((x: { id: number }) => x.id === p.id));

    const um = await chamar("GET", `/pacientes/${p.id}`);
    assert.equal(um.status, 200);
    assert.equal(um.body.id, p.id);

    const nao = await chamar("GET", "/pacientes/999999");
    assert.equal(nao.status, 404);
    assert.equal(nao.body.message, "Paciente não encontrado.");
  });

  it("recusa identificador que não é número (400)", async () => {
    const r = await chamar("GET", "/pacientes/abc");

    assert.equal(r.status, 400);
    assert.equal(r.body.message, "Identificador inválido.");
  });

  it("atualiza parcialmente com PATCH (200)", async () => {
    const p = await criarPaciente();
    const r = await chamar("PATCH", `/pacientes/${p.id}`, { telefone: "16998887777" });

    assert.equal(r.status, 200);
    assert.equal(r.body.telefone, "16998887777");
    assert.equal(r.body.nome, p.nome);
  });

  it("não permite alterar o CPF (400) e responde 404 para paciente inexistente", async () => {
    const p = await criarPaciente();

    const cpf = await chamar("PATCH", `/pacientes/${p.id}`, { cpf: cpfFicticio(999) });
    assert.equal(cpf.status, 400);
    assert.equal(cpf.body.message, "O CPF não pode ser alterado.");

    const nao = await chamar("PATCH", "/pacientes/999999", { telefone: "1" });
    assert.equal(nao.status, 404);
  });

  it("valida a UF e o e-mail ao atualizar (400)", async () => {
    const p = await criarPaciente();

    const uf = await chamar("PATCH", `/pacientes/${p.id}`, { uf: "SPP" });
    assert.equal(uf.status, 400);
    assert.equal(uf.body.message, "UF deve conter 2 letras.");

    const email = await chamar("PATCH", `/pacientes/${p.id}`, { email: "x" });
    assert.equal(email.status, 400);
    assert.equal(email.body.message, "E-mail inválido.");
  });

  it("responde 400 para JSON malformado", async () => {
    const r = await chamar("POST", "/pacientes", "{ nome: ", {});

    assert.equal(r.status, 400);
    assert.equal(r.body.message, "JSON inválido.");
  });

  it("exclui paciente sem visitas (204)", async () => {
    const p = await criarPaciente();

    assert.equal((await chamar("DELETE", `/pacientes/${p.id}`)).status, 204);
    assert.equal((await chamar("GET", `/pacientes/${p.id}`)).status, 404);
  });
});


describe("Dentista", () => {
  it("cria, atualiza e exclui (201, 200, 204)", async () => {
    const d = await criarDentista();
    assert.equal(d.ativo, true);

    const r = await chamar("PATCH", `/dentistas/${d.id}`, { nome: `${MARCA} Dr. Sérgio` });
    assert.equal(r.status, 200);
    assert.equal(r.body.nome, `${MARCA} Dr. Sérgio`);

    assert.equal((await chamar("DELETE", `/dentistas/${d.id}`)).status, 204);
  });

  it("exige nome (400) e responde 404 se não existir", async () => {
    const sem = await chamar("POST", "/dentistas", {});
    assert.equal(sem.status, 400);

    const nao = await chamar("GET", "/dentistas/999999");
    assert.equal(nao.status, 404);
    assert.equal(nao.body.message, "Dentista não encontrado.");
  });
});


describe("HistoricoVisita", () => {
  const visita = (pacienteId: number, dentistaId: number, extra: Record<string, unknown> = {}) => ({
    data_visita: "2026-09-15T00:00:00.000Z",
    procedimento: `${MARCA} Limpeza`,
    dentista_id: dentistaId,
    paciente_id: pacienteId,
    ...extra,
  });

  it("cria visita (201) e devolve paciente e dentista embutidos", async () => {
    const p = await criarPaciente();
    const d = await criarDentista();

    const criada = await chamar("POST", "/historico-visitas", visita(p.id, d.id));
    assert.equal(criada.status, 201, JSON.stringify(criada.body));
    assert.equal(criada.body.registro_antigo, false);

    const um = await chamar("GET", `/historico-visitas/${criada.body.id}`);
    assert.equal(um.status, 200);
    assert.deepEqual(Object.keys(um.body.paciente).sort(), ["id", "nome", "telefone"]);
    assert.equal(um.body.paciente.id, p.id);
    assert.equal(um.body.dentista.id, d.id);

    const lista = await chamar("GET", "/historico-visitas");
    assert.equal(lista.status, 200);
    assert.ok(lista.body.some((x: { id: number }) => x.id === criada.body.id));
  });

  it("responde 404 se o paciente ou o dentista não existirem", async () => {
    const p = await criarPaciente();
    const d = await criarDentista();

    const semPaciente = await chamar("POST", "/historico-visitas", visita(999999, d.id));
    assert.equal(semPaciente.status, 404);
    assert.equal(semPaciente.body.message, "Paciente não encontrado.");

    const semDentista = await chamar("POST", "/historico-visitas", visita(p.id, 999999));
    assert.equal(semDentista.status, 404);
    assert.equal(semDentista.body.message, "Dentista não encontrado.");

    const nao = await chamar("GET", "/historico-visitas/999999");
    assert.equal(nao.status, 404);
    assert.equal(nao.body.message, "Visita não encontrada.");
  });

  it("recusa data futura ou inválida (400)", async () => {
    const p = await criarPaciente();
    const d = await criarDentista();

    const futura = await chamar("POST", "/historico-visitas", visita(p.id, d.id, { data_visita: "2999-01-01T00:00:00.000Z" }));
    assert.equal(futura.status, 400);
    assert.equal(futura.body.message, "A data da visita não pode ser futura.");

    for (const valor of ["2026-13-45", "ontem", null]) {
      const r = await chamar("POST", "/historico-visitas", visita(p.id, d.id, { data_visita: valor }));
      assert.equal(r.status, 400, String(valor));
      assert.equal(r.body.message, "Data da visita inválida.");
    }
  });

  it("recusa visita nova para paciente desativado, mas o atendimento antigo é aceito", async () => {
    const p = await criarPaciente();
    const d = await criarDentista();

    const arquivar = await chamar("PATCH", `/pacientes/${p.id}`, { ativo: false });
    assert.equal(arquivar.status, 200);
    assert.equal(arquivar.body.ativo, false);

    const nova = await chamar("POST", "/historico-visitas", visita(p.id, d.id));
    assert.equal(nova.status, 400);
    assert.equal(nova.body.message, "Não é possível registrar visita para paciente desativado.");

    const antigo = await chamar("POST", "/historico-visitas/antigos", visita(p.id, d.id));
    assert.equal(antigo.status, 201, JSON.stringify(antigo.body));
    assert.equal(antigo.body.registro_antigo, true);
  });

  it("o atendimento antigo continua exigindo paciente existente e data não futura", async () => {
    const p = await criarPaciente();
    const d = await criarDentista();

    const semPaciente = await chamar("POST", "/historico-visitas/antigos", visita(999999, d.id));
    assert.equal(semPaciente.status, 404);

    const futura = await chamar("POST", "/historico-visitas/antigos", visita(p.id, d.id, { data_visita: "2999-01-01" }));
    assert.equal(futura.status, 400);
    assert.equal(futura.body.message, "A data da visita não pode ser futura.");
  });

  it("dentista desativado só serve a atendimento antigo", async () => {
    const p = await criarPaciente();
    const d = await criarDentista();
    await chamar("PATCH", `/dentistas/${d.id}`, { ativo: false });

    const nova = await chamar("POST", "/historico-visitas", visita(p.id, d.id));
    assert.equal(nova.status, 400);
    assert.equal(nova.body.message, "Não é possível registrar visita com dentista desativado.");

    const antigo = await chamar("POST", "/historico-visitas/antigos", visita(p.id, d.id));
    assert.equal(antigo.status, 201);
  });

  it("atualiza a visita (200) e não deixa o cliente alterar registro_antigo", async () => {
    const p = await criarPaciente();
    const d = await criarDentista();
    const v = (await chamar("POST", "/historico-visitas", visita(p.id, d.id))).body;

    const r = await chamar("PATCH", `/historico-visitas/${v.id}`, { observacoes: "Retorno em 6 meses", registro_antigo: true });
    assert.equal(r.status, 200);
    assert.equal(r.body.observacoes, "Retorno em 6 meses");
    assert.equal(r.body.registro_antigo, false);
  });

  it("ao corrigir o paciente da visita, revalida o paciente (404 e 400)", async () => {
    const p = await criarPaciente();
    const outro = await criarPaciente();
    const d = await criarDentista();
    const v = (await chamar("POST", "/historico-visitas", visita(p.id, d.id))).body;

    assert.equal((await chamar("PATCH", `/historico-visitas/${v.id}`, { paciente_id: 999999 })).status, 404);

    await chamar("PATCH", `/pacientes/${outro.id}`, { ativo: false });
    assert.equal((await chamar("PATCH", `/historico-visitas/${v.id}`, { paciente_id: outro.id })).status, 400);
  });

  it("não exclui paciente nem dentista que têm visitas (409); a exclusão da visita libera (204)", async () => {
    const p = await criarPaciente();
    const d = await criarDentista();
    const v = (await chamar("POST", "/historico-visitas", visita(p.id, d.id))).body;

    const delPaciente = await chamar("DELETE", `/pacientes/${p.id}`);
    assert.equal(delPaciente.status, 409);
    assert.equal(
      delPaciente.body.message,
      "Paciente possui histórico de visitas e não pode ser excluído. Desative o cadastro."
    );

    const delDentista = await chamar("DELETE", `/dentistas/${d.id}`);
    assert.equal(delDentista.status, 409);

    assert.equal((await chamar("DELETE", `/historico-visitas/${v.id}`)).status, 204);
    assert.equal((await chamar("DELETE", `/pacientes/${p.id}`)).status, 204);
    assert.equal((await chamar("DELETE", `/dentistas/${d.id}`)).status, 204);
  });
});


describe("CORS", () => {
  it("aceita a origem do front-end e não libera outras", async () => {
    const permitida = await chamar("GET", "/pacientes", undefined, { Origin: "http://localhost:5173" });
    assert.equal(permitida.headers.get("access-control-allow-origin"), "http://localhost:5173");

    const outra = await chamar("GET", "/pacientes", undefined, { Origin: "http://site-estranho.example" });
    assert.equal(outra.headers.get("access-control-allow-origin"), null);
  });
});


// Deve ser o ÚLTIMO bloco: chama limparCriados() no meio da execução.
describe("Limpeza dos testes", () => {
  it("remove somente os registros criados por esta execução e preserva os de terceiros", async () => {
    // "Terceiros": criados direto no banco, fora do registro desta execução,
    // com o MESMO prefixo "[TESTE]". Uma limpeza por prefixo os apagaria.
    const dentistaTerceiro = await prisma.dentista.create({ data: { nome: `${MARCA} Terceiro ${RODADA}` } });
    const pacienteTerceiro = await prisma.paciente.create({
      data: { nome: `${MARCA} Terceiro ${RODADA}`, cpf: cpfFicticio(9001), data_nascimento: new Date("1990-01-01"), telefone: "16990000000" },
    });
    const visitaTerceira = await prisma.historicoVisita.create({
      data: {
        data_visita: new Date("2020-01-01"), procedimento: `${MARCA} Terceiro ${RODADA}`,
        paciente_id: pacienteTerceiro.id, dentista_id: dentistaTerceiro.id,
      },
    });

    try {
      // Registros desta execução: paciente, dentista e visita criados pela API
      const p = await criarPaciente();
      const d = await criarDentista();
      const v = await chamar("POST", "/historico-visitas", {
        data_visita: "2026-09-15T00:00:00.000Z", procedimento: `${MARCA} Limpeza`,
        dentista_id: d.id, paciente_id: p.id,
      });
      assert.equal(v.status, 201, JSON.stringify(v.body));

      assert.ok(criados.pacientes.has(p.id) && criados.dentistas.has(d.id) && criados.visitas.has(v.body.id));
      assert.ok(!criados.pacientes.has(pacienteTerceiro.id) && !criados.dentistas.has(dentistaTerceiro.id) && !criados.visitas.has(visitaTerceira.id));

      const idsVisitas = [...criados.visitas];
      const idsPacientes = [...criados.pacientes];
      const idsDentistas = [...criados.dentistas];

      await limparCriados();

      // Tudo o que esta execução criou foi removido...
      assert.equal(await prisma.historicoVisita.count({ where: { id: { in: idsVisitas } } }), 0);
      assert.equal(await prisma.paciente.count({ where: { id: { in: idsPacientes } } }), 0);
      assert.equal(await prisma.dentista.count({ where: { id: { in: idsDentistas } } }), 0);

      // ...e os terceiros, com o mesmo prefixo, continuam existindo
      assert.equal(await prisma.historicoVisita.count({ where: { id: visitaTerceira.id } }), 1);
      assert.equal(await prisma.paciente.count({ where: { id: pacienteTerceiro.id } }), 1);
      assert.equal(await prisma.dentista.count({ where: { id: dentistaTerceiro.id } }), 1);
    }
    finally {
      // Os terceiros são removidos pelos seus próprios ids, na ordem das chaves estrangeiras
      await prisma.historicoVisita.deleteMany({ where: { id: visitaTerceira.id } });
      await prisma.paciente.deleteMany({ where: { id: pacienteTerceiro.id } });
      await prisma.dentista.deleteMany({ where: { id: dentistaTerceiro.id } });
    }
  });
});
