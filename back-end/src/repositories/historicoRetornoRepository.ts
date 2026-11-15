import { prisma } from "../database/client.ts";


const include = {
  usuario: {
    select: { id: true, nome: true },
  },
};


export function findByRetorno(retorno_id: number) {
  return prisma.historicoRetorno.findMany({
    where: { retorno_id },
    include,
    orderBy: [
      { registrado_em: "asc" },
      { id: "asc" },
    ],
  });
}
