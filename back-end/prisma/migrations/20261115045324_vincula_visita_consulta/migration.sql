/*
  Warnings:

  - A unique constraint covering the columns `[consulta_id]` on the table `HistoricoVisita` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "HistoricoVisita" ADD COLUMN     "consulta_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "HistoricoVisita_consulta_id_key" ON "HistoricoVisita"("consulta_id");

-- AddForeignKey
ALTER TABLE "HistoricoVisita" ADD CONSTRAINT "HistoricoVisita_consulta_id_fkey" FOREIGN KEY ("consulta_id") REFERENCES "Consulta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
