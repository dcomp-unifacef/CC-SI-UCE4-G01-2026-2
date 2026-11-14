CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- CreateEnum
CREATE TYPE "StatusConsulta" AS ENUM ('AGENDADA', 'CONFIRMADA', 'REALIZADA', 'FALTOU', 'CANCELADA');

-- CreateTable
CREATE TABLE "Consulta" (
    "id" SERIAL NOT NULL,
    "paciente_id" INTEGER NOT NULL,
    "dentista_id" INTEGER NOT NULL,
    "inicio_em" TIMESTAMPTZ(3) NOT NULL,
    "duracao_min" INTEGER NOT NULL,
    "fim_em" TIMESTAMPTZ(3) NOT NULL,
    "status" "StatusConsulta" NOT NULL DEFAULT 'AGENDADA',
    "encaixe" BOOLEAN NOT NULL DEFAULT false,
    "criada_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizada_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Consulta_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Consulta_duracao_positiva" CHECK ("duracao_min" > 0),
    CONSTRAINT "Consulta_fim_coerente" CHECK ("fim_em" = "inicio_em" + "duracao_min" * INTERVAL '1 minute')
);

-- CreateIndex
CREATE INDEX "Consulta_dentista_id_inicio_em_idx" ON "Consulta"("dentista_id", "inicio_em");

-- CreateIndex
CREATE INDEX "Consulta_paciente_id_idx" ON "Consulta"("paciente_id");

-- AddForeignKey
ALTER TABLE "Consulta" ADD CONSTRAINT "Consulta_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consulta" ADD CONSTRAINT "Consulta_dentista_id_fkey" FOREIGN KEY ("dentista_id") REFERENCES "Dentista"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Consulta" ADD CONSTRAINT "Consulta_sem_sobreposicao" EXCLUDE USING gist ("dentista_id" WITH =, tstzrange("inicio_em", "fim_em", '[)') WITH &&) WHERE ("status" IN ('AGENDADA', 'CONFIRMADA', 'REALIZADA'));
