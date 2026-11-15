export interface AtrasoRetornoRespostaDto {
  paciente: { id: number; nome: string; telefone: string };
  ultima_visita: {
    id: number;
    data_visita: string;
    dentista: { id: number; nome: string };
  };
  dias_desde: number;
  meses_desde: number;
  retorno: {
    id: number;
    data_prevista: string;
    vencido: boolean;
  } | null;
  retorno_descartado: boolean;
}
