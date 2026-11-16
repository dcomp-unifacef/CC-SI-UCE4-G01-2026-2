-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TipoAcessoPaciente" ADD VALUE 'CONSULTA';
ALTER TYPE "TipoAcessoPaciente" ADD VALUE 'LISTA_CONSULTAS';
ALTER TYPE "TipoAcessoPaciente" ADD VALUE 'HISTORICO_CONSULTA';
ALTER TYPE "TipoAcessoPaciente" ADD VALUE 'RETORNO';
ALTER TYPE "TipoAcessoPaciente" ADD VALUE 'LISTA_RETORNOS';
ALTER TYPE "TipoAcessoPaciente" ADD VALUE 'HISTORICO_RETORNO';
ALTER TYPE "TipoAcessoPaciente" ADD VALUE 'LISTA_ATRASOS';
ALTER TYPE "TipoAcessoPaciente" ADD VALUE 'LISTA_CONTATOS';
