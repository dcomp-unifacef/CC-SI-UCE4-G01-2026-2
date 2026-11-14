import type { Perfil } from "../../../generated/prisma/client.ts";


// O login não faz parte deste DTO: por enquanto ele não é alterado.
export interface UpdateUsuarioDto {
  nome?: string;
  perfil?: Perfil;
  ativo?: boolean;
  senha_hash?: string; // hash já calculado pelo service; nunca a senha
  tentativas_falhas?: number;
  bloqueado_ate?: Date | null;
}
