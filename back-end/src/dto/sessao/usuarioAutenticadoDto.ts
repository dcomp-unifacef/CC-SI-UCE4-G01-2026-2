import type { Perfil } from "../../../generated/prisma/client.ts";


export interface UsuarioAutenticadoDto {
  id: number;
  nome: string;
  login: string;
  perfil: Perfil;
}
