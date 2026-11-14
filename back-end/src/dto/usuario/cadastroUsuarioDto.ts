import type { Perfil } from "../../../generated/prisma/client.ts";


export interface CadastroUsuarioDto {
  nome: string;
  login: string;
  senha: string;
  perfil: Perfil;
}
