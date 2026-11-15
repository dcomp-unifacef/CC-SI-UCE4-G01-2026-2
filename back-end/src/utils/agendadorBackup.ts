import * as service from "../services/backupService.ts";


const INTERVALO_EM_MS = 60 * 1000;

const ATRASO_INICIAL_EM_MS = 30 * 1000;


let temporizador: NodeJS.Timeout | null = null;
let ligado = false;
let primeiroCiclo = true;


function agendar(espera: number): void {
  temporizador = setTimeout(() => {
    void executarCiclo();
  }, espera);

  temporizador.unref();
}


async function executarCiclo(): Promise<void> {
  try {
    if (primeiroCiclo) {
      primeiroCiclo = false;
      await service.aoIniciar();
    }

    await service.verificarAgendamento();
  }
  catch (erro) {
    const e = erro as { name?: string; code?: string };

    console.error("Agendador de backup:", e?.name ?? "Error", e?.code ?? "");
  }
  finally {
    if (ligado) {
      agendar(INTERVALO_EM_MS);
    }
  }
}


export function iniciarAgendador(): void {
  if (ligado) return;

  ligado = true;
  primeiroCiclo = true;
  agendar(ATRASO_INICIAL_EM_MS);
}


export function pararAgendador(): void {
  ligado = false;

  if (temporizador !== null) {
    clearTimeout(temporizador);
    temporizador = null;
  }
}
