import type { Paciente } from "../../../generated/prisma/client.ts";
import type { ConsentimentoResumoRespostaDto } from "../consentimento/consentimentoResumoRespostaDto.ts";


export type PacienteComConsentimentoDto = Paciente & {
  consentimento: ConsentimentoResumoRespostaDto;
};
