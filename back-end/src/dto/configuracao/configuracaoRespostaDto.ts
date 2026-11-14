export interface ConfiguracaoRespostaDto {
  sessao_inatividade_min: number;
  sessao_duracao_max_min: number;
  consulta_duracao_max_min: number;
  atualizado_em: Date;
  atualizado_por_id: number | null;
}
