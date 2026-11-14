import { prisma } from "../database/client.ts";

import type { UpdateConfiguracaoDto }
  from "../dto/configuracao/updateConfiguracaoDto.ts";


// A configuração é uma linha única (id = 1, garantido por CHECK no banco) e
// é criada pela própria migration. Por isso não há create nem remove.
const ID_UNICO = 1;


// Devolve null se a linha não existir (por exemplo, se alguém a excluiu
// manualmente no banco). Como tratar isso é regra do service.
export function find() {
  return prisma.configuracao.findUnique({
    where: { id: ID_UNICO },
  });
}


// Lança P2025 se a linha não existir. O service decide a mensagem.
export function update(data: UpdateConfiguracaoDto) {
  return prisma.configuracao.update({
    where: { id: ID_UNICO },
    data,
  });
}
