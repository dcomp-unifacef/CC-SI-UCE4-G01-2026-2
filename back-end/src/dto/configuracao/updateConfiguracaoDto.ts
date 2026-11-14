// Todos os valores são em minutos. As regras (maior que zero e inatividade
// não maior que a duração absoluta) são validadas no service e também
// garantidas por CHECK no banco.
export interface UpdateConfiguracaoDto {
  sessao_inatividade_min?: number;
  sessao_duracao_max_min?: number;
  consulta_duracao_max_min?: number;
  atualizado_por_id?: number; // usuário que fez a alteração
}
