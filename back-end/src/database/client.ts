import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";


const connectionString = process.env.DATABASE_URL;


if (!connectionString) {
  throw new Error("DATABASE_URL não definida");
}


const adapter = new PrismaPg({
  connectionString,
});


const prisma = new PrismaClient({
  adapter,


  log: [
    { emit: "event", level: "query" },
    { emit: "stdout", level: "error" },
    { emit: "stdout", level: "info" },
    { emit: "stdout", level: "warn" },
  ],
});


// Estas são as instruções que mostrarão no terminal todas
// as instruções SQL geradas pelo Prisma.
// Os valores (params) NÃO são exibidos: eles podem conter dados
// pessoais ou clínicos. Mostramos apenas a quantidade deles.
if (process.env.NODE_ENV !== "production") {
  prisma.$on("query", (e) => {
    let quantidade = 0;

    try {
      quantidade = (JSON.parse(e.params) as unknown[]).length;
    }
    catch {
      quantidade = 0;
    }

    console.log("---");
    console.log("Query: " + e.query);
    console.log("Params: [" + quantidade + " valor(es) oculto(s)]");
    console.log("Duration: " + e.duration + "ms");
  });
}


export { prisma };
