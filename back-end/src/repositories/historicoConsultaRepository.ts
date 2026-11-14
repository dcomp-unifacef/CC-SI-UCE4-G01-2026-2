import { prisma } from "../database/client.ts";


const include = {
  usuario: {
    select: { id: true, nome: true },
  },
};


export function findByConsulta(consulta_id: number) {
  return prisma.historicoConsulta.findMany({
    where: { consulta_id },
    include,
    orderBy: [
      { registrado_em: "asc" },
      { id: "asc" },
    ],
  });
}
