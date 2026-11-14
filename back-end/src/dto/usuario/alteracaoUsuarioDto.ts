import type { Perfil } from "../../../generated/prisma/client.ts";


export interface AlteracaoUsuarioDto {
  nome?: string;
  perfil?: Perfil;
  ativo?: boolean;
}
