-- CreateTable
CREATE TABLE "HistoricoVisita" (
    "id" SERIAL NOT NULL,
    "data_visita" DATE NOT NULL,
    "procedimento" TEXT NOT NULL,
    "observacoes" TEXT,
    "registro_antigo" BOOLEAN NOT NULL DEFAULT false,
    "paciente_id" INTEGER NOT NULL,
    "dentista_id" INTEGER NOT NULL,

    CONSTRAINT "HistoricoVisita_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "HistoricoVisita" ADD CONSTRAINT "HistoricoVisita_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoVisita" ADD CONSTRAINT "HistoricoVisita_dentista_id_fkey" FOREIGN KEY ("dentista_id") REFERENCES "Dentista"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
