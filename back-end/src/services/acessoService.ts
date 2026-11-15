import * as repository from "../repositories/logAcessoRepository.ts";

import type { TipoAcessoPaciente } from "../../generated/prisma/client.ts";
import type { UsuarioAutenticado } from "./consultaService.ts";

import { ServiceUnavailableError } from "../errors/ServiceUnavailableError.ts";


const MENSAGEM_FALHA =
  "Não foi possível registrar o acesso aos dados do paciente. Os dados não foram entregues; tente novamente.";


function falhou(erro: unknown): never {
  const e = erro as { name?: string; code?: string };

  console.error("Falha ao registrar acesso:", e?.name ?? "Error", e?.code ?? "");

  throw new ServiceUnavailableError(MENSAGEM_FALHA);
}


export async function registrar(
  usuario: UsuarioAutenticado,
  tipo: TipoAcessoPaciente,
  paciente_id: number
): Promise<void> {
  try {
    await repository.registrar({
      usuario_id: usuario.id,
      paciente_id,
      tipo,
    });
  }
  catch (erro) {
    falhou(erro);
  }
}


export async function registrarLista(
  usuario: UsuarioAutenticado,
  tipo: TipoAcessoPaciente,
  pacienteIds: number[]
): Promise<void> {
  try {
    await repository.registrarLote(usuario.id, tipo, pacienteIds);
  }
  catch (erro) {
    falhou(erro);
  }
}
