import { prisma } from "../database/client.ts";

import type { UpdateConfiguracaoDto }
  from "../dto/configuracao/updateConfiguracaoDto.ts";


const ID_UNICO = 1;


export function find() {
  return prisma.configuracao.findUnique({
    where: { id: ID_UNICO },
  });
}


export function update(data: UpdateConfiguracaoDto) {
  return prisma.configuracao.update({
    where: { id: ID_UNICO },
    data,
  });
}
