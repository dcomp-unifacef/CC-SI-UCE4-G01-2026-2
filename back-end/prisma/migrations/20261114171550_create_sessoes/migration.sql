-- CreateTable
CREATE TABLE "Sessao" (
    "id" SERIAL NOT NULL,
    "token_hash" TEXT NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "criada_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expira_em" TIMESTAMPTZ(3) NOT NULL,
    "ultimo_uso_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revogada_em" TIMESTAMPTZ(3),

    CONSTRAINT "Sessao_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Sessao_expira_apos_criacao" CHECK ("expira_em" > "criada_em")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sessao_token_hash_key" ON "Sessao"("token_hash");

-- CreateIndex
CREATE INDEX "Sessao_usuario_id_idx" ON "Sessao"("usuario_id");

-- AddForeignKey
ALTER TABLE "Sessao" ADD CONSTRAINT "Sessao_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
