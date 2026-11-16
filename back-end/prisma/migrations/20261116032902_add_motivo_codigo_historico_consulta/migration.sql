-- CreateEnum
CREATE TYPE "MotivoConsulta" AS ENUM ('SOLICITACAO_DO_PACIENTE', 'IMPOSSIBILIDADE_DO_CONSULTORIO', 'IMPOSSIBILIDADE_DO_DENTISTA', 'OUTRO');

-- AlterTable
ALTER TABLE "HistoricoConsulta" ADD COLUMN     "motivo_codigo" "MotivoConsulta";
