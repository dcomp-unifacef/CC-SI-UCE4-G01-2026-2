import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { isValidCpf, normalizeCpf } from "../src/utils/cpf.ts";


describe("CPF", () => {
  it("remove a pontuação", () => {
    assert.equal(normalizeCpf("529.982.247-25"), "52998224725");
  });

  it("aceita CPFs válidos, com ou sem pontuação", () => {
    assert.equal(isValidCpf("529.982.247-25"), true);
    assert.equal(isValidCpf("52998224725"), true);
    assert.equal(isValidCpf("111.444.777-35"), true);
    assert.equal(isValidCpf("123.456.789-09"), true);
  });

  it("recusa dígito verificador errado", () => {
    assert.equal(isValidCpf("529.982.247-24"), false);
    assert.equal(isValidCpf("52998224726"), false);
    assert.equal(isValidCpf("123.456.789-10"), false);
  });

  it("recusa tamanho incorreto e texto sem números", () => {
    assert.equal(isValidCpf(""), false);
    assert.equal(isValidCpf("1234567890"), false);
    assert.equal(isValidCpf("529982247251"), false);
    assert.equal(isValidCpf("abc"), false);
  });

  it("recusa CPFs com todos os dígitos iguais", () => {
    for (let d = 0; d <= 9; d++) {
      assert.equal(isValidCpf(String(d).repeat(11)), false, `CPF ${String(d).repeat(11)}`);
    }
  });
});
