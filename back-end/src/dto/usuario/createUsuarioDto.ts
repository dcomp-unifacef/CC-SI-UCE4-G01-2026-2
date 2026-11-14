import type { Perfil } from "../../../generated/prisma/client.ts";
import type { LoginNormalizado } from "../../utils/login.ts";


export interface CreateUsuarioDto {
  nome: string;
  login: LoginNormalizado;
  senha_hash: string; // hash já calculado pelo service; nunca a senha
  perfil: Perfil;
}
