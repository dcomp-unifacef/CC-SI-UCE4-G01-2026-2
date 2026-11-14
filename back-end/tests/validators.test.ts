import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  converterData,
  dataFutura,
  emailValido,
  hoje,
  validarId,
} from "../src/utils/validators.ts";


describe("datas", () => {
  it("converte texto ISO em data sem horário", () => {
    assert.equal(converterData("1965-03-10T00:00:00.000Z")?.toISOString(), "1965-03-10T00:00:00.000Z");
    assert.equal(converterData("2026-09-15")?.toISOString(), "2026-09-15T00:00:00.000Z");
  });

  it("recusa datas inválidas ou que não são texto", () => {
    assert.equal(converterData("2026-13-45"), null);
    assert.equal(converterData("2026-02-31"), null);
    assert.equal(converterData("15/09/2026"), null);
    assert.equal(converterData(""), null);
    assert.equal(converterData(20260915), null);
    assert.equal(converterData(null), null);
    assert.equal(converterData(undefined), null);
  });

  it("identifica datas futuras, mas não a de hoje", () => {
    assert.equal(dataFutura(new Date("2999-01-01")), true);
    assert.equal(dataFutura(new Date("2000-01-01")), false);
    assert.equal(dataFutura(new Date(hoje())), false);
  });
});


describe("e-mail", () => {
  it("aceita e recusa formatos", () => {
    assert.equal(emailValido("familia@example.com"), true);
    assert.equal(emailValido("sem-arroba.com"), false);
    assert.equal(emailValido("a@b"), false);
    assert.equal(emailValido("com espaco@example.com"), false);
  });
});


describe("identificador", () => {
  it("aceita inteiros positivos e recusa o restante", () => {
    assert.doesNotThrow(() => validarId(1));
    assert.throws(() => validarId(NaN), /Identificador inválido/);
    assert.throws(() => validarId(0), /Identificador inválido/);
    assert.throws(() => validarId(1.5), /Identificador inválido/);
    assert.throws(() => validarId(99999999999), /Identificador inválido/);
  });
});
