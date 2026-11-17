export type UsuarioAdmin = {
  id: number
  nome: string
  login: string
  perfil: 'DONO' | 'DENTISTA' | 'SECRETARIA'
  ativo: boolean
  criado_em: string
  atualizado_em: string
}
