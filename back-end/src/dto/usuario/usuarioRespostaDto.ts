import type { Perfil } from "../../../generated/prisma/client.ts";


export interface UsuarioRespostaDto {
  id: number;
  nome: string;
  login: string;
  perfil: Perfil;
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date;
}
