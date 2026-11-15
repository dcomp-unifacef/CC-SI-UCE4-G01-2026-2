-- CreateEnum
CREATE TYPE "ResultadoContatoRetorno" AS ENUM ('SEM_RESPOSTA', 'AGENDOU', 'RECUSOU');

-- CreateTable
CREATE TABLE "ContatoRetorno" (
    "id" SERIAL NOT NULL,
    "paciente_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "registrado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resultado" "ResultadoContatoRetorno" NOT NULL,
    "anotacao" TEXT,

    CONSTRAINT "ContatoRetorno_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContatoRetorno_paciente_id_registrado_em_idx" ON "ContatoRetorno"("paciente_id", "registrado_em");

-- AddForeignKey
ALTER TABLE "ContatoRetorno" ADD CONSTRAINT "ContatoRetorno_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContatoRetorno" ADD CONSTRAINT "ContatoRetorno_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ContatoRetorno" ADD CONSTRAINT "ContatoRetorno_anotacao_nao_vazia" CHECK (
  "anotacao" IS NULL OR length(btrim("anotacao")) > 0
);
