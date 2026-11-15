import type {
  SituacaoRetorno,
  TipoHistoricoRetorno,
} from "../../../generated/prisma/client.ts";


export interface HistoricoRetornoRespostaDto {
  id: number;
  tipo: TipoHistoricoRetorno;
  data_anterior: string | null;
  data_nova: string | null;
  situacao_anterior: SituacaoRetorno | null;
  situacao_nova: SituacaoRetorno;
  motivo?: string | null;
  registrado_em: Date;
  usuario: { id: number; nome: string };
}
