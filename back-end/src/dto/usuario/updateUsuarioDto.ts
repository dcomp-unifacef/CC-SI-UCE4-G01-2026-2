import type { Perfil } from "../../../generated/prisma/client.ts";


export interface UpdateUsuarioDto {
  nome?: string;
  perfil?: Perfil;
  ativo?: boolean;
  senha_hash?: string;
  tentativas_falhas?: number;
  bloqueado_ate?: Date | null;
}
