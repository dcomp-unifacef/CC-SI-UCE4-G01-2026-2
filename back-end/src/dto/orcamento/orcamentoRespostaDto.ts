import type { SituacaoOrcamento } from "../../../generated/prisma/client.ts";


export interface ItemOrcamentoRespostaDto {
  id: number;
  procedimento_id: number;
  nome_procedimento: string;
  valor_unitario_centavos: number;
  quantidade: number;
  subtotal_centavos: number;
}


export interface OrcamentoRespostaDto {
  id: number;
  paciente: { id: number; nome: string; telefone: string | null };
  dentista: { id: number; nome: string } | null;
  situacao: SituacaoOrcamento;
  total_centavos: number;
  valido_ate: string | null;
  criado_em: Date;
  atualizado_em: Date;
  criado_por: { id: number; nome: string };
  decidido_em: Date | null;
  decidido_por: { id: number; nome: string } | null;
  itens: ItemOrcamentoRespostaDto[];
}
