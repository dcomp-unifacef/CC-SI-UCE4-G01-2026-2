import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { normalizarLogin } from "../src/utils/login.ts";
import { BadRequestError } from "../src/errors/BadRequestError.ts";
import * as usuarioRepository from "../src/repositories/usuarioRepository.ts";


describe("normalizarLogin", () => {
  it("remove os espaços das extremidades", () => {
    assert.equal(normalizarLogin("  maria  "), "maria");
    assert.equal(normalizarLogin("\tmaria\n"), "maria");
  });

  it("converte para minúsculas", () => {
    assert.equal(normalizarLogin("MARIA"), "maria");
    assert.equal(normalizarLogin("MaRiA.Silva"), "maria.silva");
  });

  it("faz as duas coisas juntas, e variações do mesmo login resultam no mesmo valor", () => {
    const variacoes = ["Jose", " jose ", "JOSE", "\tJose\n", "  JOSE  "];

    for (const v of variacoes) {
      assert.equal(normalizarLogin(v), "jose", JSON.stringify(v));
    }
  });

  it("é idempotente (normalizar de novo não muda o resultado)", () => {
    const uma = normalizarLogin("  Ana.Paula  ");

    assert.equal(normalizarLogin(uma), uma);
  });

  it("não altera espaços internos nem acentos", () => {
    assert.equal(normalizarLogin("  Maria Silva "), "maria silva");
    assert.notEqual(normalizarLogin("maria silva"), normalizarLogin("mariasilva"));
    assert.equal(normalizarLogin("JOSÉ"), "josé");
    assert.notEqual(normalizarLogin("josé"), normalizarLogin("jose"));
  });

  it("recusa vazio ou só espaços (400)", () => {
    for (const v of ["", "   ", "\t\n"]) {
      assert.throws(
        () => normalizarLogin(v),
        (e: unknown) => e instanceof BadRequestError && e.statusCode === 400 && e.message === 'O campo "login" é obrigatório.',
        JSON.stringify(v)
      );
    }
  });

  it("recusa o que não é texto (400)", () => {
    for (const v of [undefined, null, 123, {}, ["jose"], true]) {
      assert.throws(
        () => normalizarLogin(v),
        (e: unknown) => e instanceof BadRequestError && e.statusCode === 400 && e.message === 'O campo "login" é inválido.'
      );
    }
  });
});


function verificacaoDeTipos(): void {
  // @ts-expect-error
  usuarioRepository.findByLogin("jose");

  // @ts-expect-error
  usuarioRepository.findCredenciaisByLogin("jose");

  // @ts-expect-error
  usuarioRepository.create({ nome: "x", login: "jose", senha_hash: "x", perfil: "DONO" });

  usuarioRepository.findByLogin(normalizarLogin("Jose"));
}


describe("tipos do repository", () => {
  it("a verificação de tipos existe e é conferida pelo tsc", () => {
    assert.equal(typeof verificacaoDeTipos, "function");
  });
});
