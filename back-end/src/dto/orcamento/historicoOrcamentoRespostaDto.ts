import type {
  SituacaoOrcamento,
  TipoHistoricoOrcamento,
} from "../../../generated/prisma/client.ts";


export interface HistoricoOrcamentoRespostaDto {
  id: number;
  tipo: TipoHistoricoOrcamento;
  situacao_anterior: SituacaoOrcamento | null;
  situacao_nova: SituacaoOrcamento;
  total_anterior_centavos: number | null;
  total_novo_centavos: number | null;
  motivo?: string | null;
  registrado_em: Date;
  usuario: { id: number; nome: string };
}
