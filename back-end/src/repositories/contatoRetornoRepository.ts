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
  return prisma.$transaction(async (tx) => {
    const trava = await tx.paciente.updateMany({
      where: { id: data.paciente_id, ativo: true },
      data: { ativo: true },
    });

    if (trava.count !== 1) {
      return null;
    }

    return tx.contatoRetorno.create({
      data: {
        paciente_id: data.paciente_id,
        usuario_id: usuarioId,
        resultado: data.resultado,
        anotacao: data.anotacao ?? null,
      },
      include,
    });
  });
}
