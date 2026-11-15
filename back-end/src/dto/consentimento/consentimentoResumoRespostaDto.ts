import type { SituacaoConsentimento } from "../../repositories/consentimentoRepository.ts";


export interface ConsentimentoResumoRespostaDto {
  situacao: SituacaoConsentimento;
  termo: string | null;
  registrado_em: Date | null;
  registrado_por: { id: number; nome: string } | null;
}
