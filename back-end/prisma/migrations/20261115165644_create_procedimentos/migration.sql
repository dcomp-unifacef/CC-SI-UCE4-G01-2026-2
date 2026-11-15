-- CreateTable
CREATE TABLE "Procedimento" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "valor_centavos" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Procedimento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Procedimento_ativo_nome_idx" ON "Procedimento"("ativo", "nome");

CREATE UNIQUE INDEX "Procedimento_nome_minusculo_key" ON "Procedimento"(lower("nome"));

ALTER TABLE "Procedimento" ADD CONSTRAINT "Procedimento_nome_valido"
    CHECK (btrim("nome") <> '' AND "nome" = btrim("nome") AND char_length("nome") <= 120);

ALTER TABLE "Procedimento" ADD CONSTRAINT "Procedimento_valor_valido"
    CHECK ("valor_centavos" > 0 AND "valor_centavos" <= 100000000);
