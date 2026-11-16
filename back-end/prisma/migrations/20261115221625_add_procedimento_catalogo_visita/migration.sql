-- AlterTable
ALTER TABLE "HistoricoVisita" ADD COLUMN     "procedimento_id" INTEGER;

-- CreateIndex
CREATE INDEX "HistoricoVisita_procedimento_id_idx" ON "HistoricoVisita"("procedimento_id");

-- AddForeignKey
ALTER TABLE "HistoricoVisita" ADD CONSTRAINT "HistoricoVisita_procedimento_id_fkey" FOREIGN KEY ("procedimento_id") REFERENCES "Procedimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
