-- CreateTable
CREATE TABLE "Dentista" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Dentista_pkey" PRIMARY KEY ("id")
);
