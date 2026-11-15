-- CreateEnum
CREATE TYPE "SituacaoOrcamento" AS ENUM ('PENDENTE', 'APROVADO', 'RECUSADO');

-- CreateEnum
CREATE TYPE "TipoHistoricoOrcamento" AS ENUM ('CRIACAO', 'ALTERACAO', 'DECISAO', 'CORRECAO', 'REABERTURA');

-- CreateTable
CREATE TABLE "Orcamento" (
    "id" SERIAL NOT NULL,
    "paciente_id" INTEGER NOT NULL,
    "dentista_id" INTEGER,
    "situacao" "SituacaoOrcamento" NOT NULL DEFAULT 'PENDENTE',
    "total_centavos" INTEGER NOT NULL DEFAULT 0,
    "valido_ate" DATE,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,
    "criado_por_id" INTEGER NOT NULL,
    "decidido_em" TIMESTAMPTZ(3),
    "decidido_por_id" INTEGER,

    CONSTRAINT "Orcamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemOrcamento" (
    "id" SERIAL NOT NULL,
    "orcamento_id" INTEGER NOT NULL,
    "procedimento_id" INTEGER NOT NULL,
    "nome_procedimento" TEXT NOT NULL,
    "valor_unitario_centavos" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemOrcamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricoOrcamento" (
    "id" SERIAL NOT NULL,
    "orcamento_id" INTEGER NOT NULL,
    "tipo" "TipoHistoricoOrcamento" NOT NULL,
    "situacao_anterior" "SituacaoOrcamento",
    "situacao_nova" "SituacaoOrcamento" NOT NULL,
    "total_anterior_centavos" INTEGER,
    "total_novo_centavos" INTEGER,
    "motivo" TEXT,
    "usuario_id" INTEGER NOT NULL,
    "registrado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricoOrcamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Orcamento_paciente_id_criado_em_idx" ON "Orcamento"("paciente_id", "criado_em");

-- CreateIndex
CREATE INDEX "Orcamento_situacao_idx" ON "Orcamento"("situacao");

-- CreateIndex
CREATE INDEX "ItemOrcamento_orcamento_id_idx" ON "ItemOrcamento"("orcamento_id");

-- CreateIndex
CREATE INDEX "ItemOrcamento_procedimento_id_idx" ON "ItemOrcamento"("procedimento_id");

-- CreateIndex
CREATE INDEX "HistoricoOrcamento_orcamento_id_idx" ON "HistoricoOrcamento"("orcamento_id");

-- AddForeignKey
ALTER TABLE "Orcamento" ADD CONSTRAINT "Orcamento_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orcamento" ADD CONSTRAINT "Orcamento_dentista_id_fkey" FOREIGN KEY ("dentista_id") REFERENCES "Dentista"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orcamento" ADD CONSTRAINT "Orcamento_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orcamento" ADD CONSTRAINT "Orcamento_decidido_por_id_fkey" FOREIGN KEY ("decidido_por_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemOrcamento" ADD CONSTRAINT "ItemOrcamento_orcamento_id_fkey" FOREIGN KEY ("orcamento_id") REFERENCES "Orcamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemOrcamento" ADD CONSTRAINT "ItemOrcamento_procedimento_id_fkey" FOREIGN KEY ("procedimento_id") REFERENCES "Procedimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoOrcamento" ADD CONSTRAINT "HistoricoOrcamento_orcamento_id_fkey" FOREIGN KEY ("orcamento_id") REFERENCES "Orcamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoOrcamento" ADD CONSTRAINT "HistoricoOrcamento_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Orcamento" ADD CONSTRAINT "Orcamento_total_valido"
    CHECK ("total_centavos" >= 0 AND "total_centavos" <= 2000000000);

ALTER TABLE "Orcamento" ADD CONSTRAINT "Orcamento_decisao_coerente"
    CHECK (
        ("situacao" = 'PENDENTE' AND "decidido_em" IS NULL AND "decidido_por_id" IS NULL)
        OR
        ("situacao" <> 'PENDENTE' AND "decidido_em" IS NOT NULL AND "decidido_por_id" IS NOT NULL)
    );

ALTER TABLE "ItemOrcamento" ADD CONSTRAINT "ItemOrcamento_nome_valido"
    CHECK (btrim("nome_procedimento") <> '' AND "nome_procedimento" = btrim("nome_procedimento") AND char_length("nome_procedimento") <= 120);

ALTER TABLE "ItemOrcamento" ADD CONSTRAINT "ItemOrcamento_valor_valido"
    CHECK ("valor_unitario_centavos" > 0 AND "valor_unitario_centavos" <= 100000000);

ALTER TABLE "ItemOrcamento" ADD CONSTRAINT "ItemOrcamento_quantidade_valida"
    CHECK ("quantidade" >= 1 AND "quantidade" <= 99);

ALTER TABLE "ItemOrcamento" ADD CONSTRAINT "ItemOrcamento_subtotal_valido"
    CHECK (("valor_unitario_centavos"::bigint * "quantidade"::bigint) <= 2000000000);

ALTER TABLE "HistoricoOrcamento" ADD CONSTRAINT "HistoricoOrcamento_totais_validos"
    CHECK (
        ("total_anterior_centavos" IS NULL OR ("total_anterior_centavos" >= 0 AND "total_anterior_centavos" <= 2000000000))
        AND
        ("total_novo_centavos" IS NULL OR ("total_novo_centavos" >= 0 AND "total_novo_centavos" <= 2000000000))
    );

ALTER TABLE "HistoricoOrcamento" ADD CONSTRAINT "HistoricoOrcamento_motivo_valido"
    CHECK ("motivo" IS NULL OR btrim("motivo") <> '');

ALTER TABLE "HistoricoOrcamento" ADD CONSTRAINT "HistoricoOrcamento_criacao_coerente"
    CHECK (
        "tipo" <> 'CRIACAO'
        OR ("situacao_anterior" IS NULL AND "situacao_nova" = 'PENDENTE'
            AND "total_anterior_centavos" IS NULL AND "total_novo_centavos" IS NOT NULL)
    );

ALTER TABLE "HistoricoOrcamento" ADD CONSTRAINT "HistoricoOrcamento_alteracao_coerente"
    CHECK (
        "tipo" <> 'ALTERACAO'
        OR ("situacao_anterior" IS NOT NULL AND "situacao_anterior" = 'PENDENTE' AND "situacao_nova" = 'PENDENTE'
            AND "total_anterior_centavos" IS NOT NULL AND "total_novo_centavos" IS NOT NULL)
    );

ALTER TABLE "HistoricoOrcamento" ADD CONSTRAINT "HistoricoOrcamento_decisao_coerente"
    CHECK (
        "tipo" <> 'DECISAO'
        OR ("situacao_anterior" IS NOT NULL AND "situacao_anterior" = 'PENDENTE'
            AND "situacao_nova" IN ('APROVADO', 'RECUSADO'))
    );

ALTER TABLE "HistoricoOrcamento" ADD CONSTRAINT "HistoricoOrcamento_correcao_coerente"
    CHECK (
        "tipo" <> 'CORRECAO'
        OR ("situacao_anterior" IS NOT NULL AND "situacao_anterior" IN ('APROVADO', 'RECUSADO')
            AND "situacao_nova" IN ('APROVADO', 'RECUSADO') AND "situacao_anterior" <> "situacao_nova"
            AND "motivo" IS NOT NULL AND btrim("motivo") <> '')
    );

ALTER TABLE "HistoricoOrcamento" ADD CONSTRAINT "HistoricoOrcamento_reabertura_coerente"
    CHECK (
        "tipo" <> 'REABERTURA'
        OR ("situacao_anterior" IS NOT NULL AND "situacao_anterior" IN ('APROVADO', 'RECUSADO')
            AND "situacao_nova" = 'PENDENTE'
            AND "motivo" IS NOT NULL AND btrim("motivo") <> '')
    );
