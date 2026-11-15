import { prisma } from "../database/client.ts";

import type { CreateContatoRetornoDto }
  from "../dto/contatoRetorno/createContatoRetornoDto.ts";


const include = {
  usuario: {
    select: { id: true, nome: true },
  },
};


export function findByPaciente(paciente_id: number) {
  return prisma.contatoRetorno.findMany({
    where: { paciente_id },
    include,
    orderBy: [
      { registrado_em: "desc" },
      { id: "desc" },
    ],
  });
}


export function create(
  data: CreateContatoRetornoDto,
  usuarioId: number
) {
  return prisma.contatoRetorno.create({
    data: {
      paciente_id: data.paciente_id,
      usuario_id: usuarioId,
      resultado: data.resultado,
      anotacao: data.anotacao ?? null,
    },
    include,
  });
}
