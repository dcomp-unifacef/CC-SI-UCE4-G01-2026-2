import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { gerarToken, hashDoToken } from "../src/utils/token.ts";
import { BadRequestError } from "../src/errors/BadRequestError.ts";


describe("gerarToken", () => {
  it("gera o token em base64url com 43 caracteres (32 bytes)", () => {
    const { token } = gerarToken();

    assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  });

  it("gera tokens e hashes todos diferentes", () => {
    const tokens = new Set<string>();
    const hashes = new Set<string>();

    for (let i = 0; i < 1000; i++) {
      const { token, hash } = gerarToken();
      tokens.add(token);
      hashes.add(hash);
    }

    assert.equal(tokens.size, 1000);
    assert.equal(hashes.size, 1000);
  });

  it("o hash tem 64 caracteres hexadecimais, difere do token e não o contém", () => {
    const { token, hash } = gerarToken();

    assert.match(hash, /^[0-9a-f]{64}$/);
    assert.notEqual(hash, token);
    assert.ok(!hash.includes(token));
  });

  it("o par é consistente: o hash corresponde ao token", () => {
    const { token, hash } = gerarToken();

    assert.equal(hashDoToken(token), hash);
  });

  it("não escreve nada no console (o token não vai para o log)", () => {
    const metodos = ["log", "info", "warn", "error", "debug"] as const;
    const originais = metodos.map((m) => console[m]);
    let chamadas = 0;

    for (const m of metodos) {
      console[m] = () => { chamadas += 1; };
    }

    try {
      gerarToken();
      hashDoToken("qualquer-token");
    }
    finally {
      metodos.forEach((m, i) => { console[m] = originais[i]!; });
    }

    assert.equal(chamadas, 0);
  });
});


describe("hashDoToken", () => {
  it("é o SHA-256 em hexadecimal (vetor conhecido)", () => {
    assert.equal(
      hashDoToken("abc"),
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
  });

  it("é determinístico", () => {
    assert.equal(hashDoToken("token-de-teste"), hashDoToken("token-de-teste"));
    assert.notEqual(hashDoToken("token-de-teste"), hashDoToken("token-de-teste "));
  });

  it("recusa o que não é texto ou é vazio (400)", () => {
    for (const v of [undefined, null, 123, {}, ["x"], true, ""]) {
      assert.throws(
        () => hashDoToken(v),
        (e: unknown) => e instanceof BadRequestError && e.statusCode === 400 && e.message === "Token inválido."
      );
    }
  });
});
