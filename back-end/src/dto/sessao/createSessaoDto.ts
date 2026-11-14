export interface CreateSessaoDto {
  token_hash: string; // hash do token (ver src/utils/token.ts); nunca o token
  usuario_id: number;
  expira_em: Date;
}
