-- CreateEnum
CREATE TYPE "AcaoConsentimento" AS ENUM ('CONCESSAO', 'REVOGACAO');

-- CreateEnum
CREATE TYPE "TipoAcessoPaciente" AS ENUM ('FICHA', 'ORCAMENTO', 'ORCAMENTO_PDF', 'VISITA', 'LISTA_PACIENTES', 'LISTA_VISITAS');

-- CreateTable
CREATE TABLE "ConsentimentoPaciente" (
    "id" SERIAL NOT NULL,
    "paciente_id" INTEGER NOT NULL,
    "acao" "AcaoConsentimento" NOT NULL,
    "termo" TEXT NOT NULL,
    "registrado_por_id" INTEGER NOT NULL,
    "registrado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentimentoPaciente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogAcesso" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "paciente_id" INTEGER NOT NULL,
    "tipo" "TipoAcessoPaciente" NOT NULL,
    "acessado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogAcesso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsentimentoPaciente_paciente_id_registrado_em_idx" ON "ConsentimentoPaciente"("paciente_id", "registrado_em");

-- CreateIndex
CREATE INDEX "LogAcesso_paciente_id_acessado_em_idx" ON "LogAcesso"("paciente_id", "acessado_em");

-- CreateIndex
CREATE INDEX "LogAcesso_usuario_id_acessado_em_idx" ON "LogAcesso"("usuario_id", "acessado_em");

-- AddForeignKey
ALTER TABLE "ConsentimentoPaciente" ADD CONSTRAINT "ConsentimentoPaciente_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentimentoPaciente" ADD CONSTRAINT "ConsentimentoPaciente_registrado_por_id_fkey" FOREIGN KEY ("registrado_por_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogAcesso" ADD CONSTRAINT "LogAcesso_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogAcesso" ADD CONSTRAINT "LogAcesso_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CheckConstraint
ALTER TABLE "ConsentimentoPaciente" ADD CONSTRAINT "ConsentimentoPaciente_termo_valido"
    CHECK ("termo" IS NOT NULL AND btrim("termo") <> '' AND "termo" = btrim("termo") AND char_length("termo") <= 60);
