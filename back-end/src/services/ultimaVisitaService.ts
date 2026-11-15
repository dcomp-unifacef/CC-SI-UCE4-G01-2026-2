import * as visitaRepository from "../repositories/historicoVisitaRepository.ts";
import * as pacienteRepository from "../repositories/pacienteRepository.ts";
import * as acessoService from "./acessoService.ts";

import { TipoAcessoPaciente } from "../../generated/prisma/client.ts";

import type { UsuarioAutenticado } from "./consultaService.ts";

import type { UltimaVisitaRespostaDto } from "../dto/historicoVisita/ultimaVisitaRespostaDto.ts";

import { NotFoundError } from "../errors/NotFoundError.ts";

import {
  converterDia,
  diasEntre,
  formatarDia,
  mesesCompletosEntre,
  subtrairMeses,
} from "../utils/datas.ts";
import { hoje, validarId } from "../utils/validators.ts";


export async function consultarUltimaVisita(
  paciente_id: number,
  usuario: UsuarioAutenticado
): Promise<UltimaVisitaRespostaDto> {
  const resposta = await ultimaVisita(paciente_id);

  await acessoService.registrar(usuario, TipoAcessoPaciente.VISITA, paciente_id);

  return resposta;
}


export async function ultimaVisita(
  paciente_id: number
): Promise<UltimaVisitaRespostaDto> {
  validarId(paciente_id);

  const paciente = await pacienteRepository.findById(paciente_id);

  if (!paciente) {
    throw new NotFoundError("Paciente não encontrado.");
  }

  const visita = await visitaRepository.findMaisRecenteDoPaciente(paciente_id);

  if (!visita) {
    return {
      paciente_id,
      sem_historico: true,
      ultima_visita: null,
      acima_de_6_meses: null,
      dias_desde: null,
      meses_desde: null,
    };
  }

  const referencia = converterDia(hoje()) ?? new Date();

  return {
    paciente_id,
    sem_historico: false,
    ultima_visita: {
      id: visita.id,
      data_visita: formatarDia(visita.data_visita),
      dentista: {
        id: visita.dentista.id,
        nome: visita.dentista.nome,
      },
    },
    acima_de_6_meses:
      visita.data_visita.getTime() < subtrairMeses(referencia, 6).getTime(),
    dias_desde: Math.max(0, diasEntre(visita.data_visita, referencia)),
    meses_desde: mesesCompletosEntre(visita.data_visita, referencia),
  };
}
