import * as repository from "../repositories/backupExecucaoRepository.ts";
import * as configuracaoRepository from "../repositories/configuracaoRepository.ts";

import { OrigemBackup } from "../../generated/prisma/client.ts";

import type { BackupExecucaoCompleto } from "../repositories/backupExecucaoRepository.ts";
import type { BackupRespostaDto } from "../dto/backup/backupRespostaDto.ts";
import type { AvisoBackupLoginDto, AvisoBackupRespostaDto } from "../dto/backup/avisoBackupRespostaDto.ts";

import { AppError } from "../errors/AppError.ts";
import { BadRequestError } from "../errors/BadRequestError.ts";
import { ConflictError } from "../errors/ConflictError.ts";
import { NotFoundError } from "../errors/NotFoundError.ts";

import {
  diaCivilNoConsultorio,
  formatarDia,
  minutosDoDiaNoConsultorio,
} from "../utils/datas.ts";

import { validarId } from "../utils/validators.ts";

import {
  caminhoDoArquivo,
  caminhoDoParcial,
  gerarDump,
  lerConfiguracaoDeBackup,
  listarArquivosDoSistema,
  nomeDoArquivo,
  publicarArquivo,
  removerArquivoDoSistema,
  removerParcialDoSistema,
  sanitizarErro,
  sha256DoArquivo,
  tamanhoDoArquivo,
  validarDump,
} from "../utils/backup.ts";

import type { ConfiguracaoDeBackup } from "../utils/backup.ts";


export type ResultadoDaExecucao = "concluido" | "falhou" | "sinal_perdido";


export interface ResultadoDoAgendamento {
  acao: "nenhuma" | "executou";
  detalhe: string;
}


export interface ResultadoDaReconciliacao {
  marcados: number;
  ausentes: string[];
  sem_registro: string[];
  parciais: string[];
}


const MANTER_COPIAS = 7;

const INTERVALO_DO_SINAL_EM_MS = 15 * 1000;

const LIMITE_SEM_SINAL_EM_MS = 5 * 60 * 1000;

const TIMEOUT_DO_DUMP_EM_MS = 30 * 60 * 1000;

const TIMEOUT_DA_VALIDACAO_EM_MS = 5 * 60 * 1000;

const LIMITE_PADRAO_DA_LISTA = 30;

const LIMITE_MAXIMO_DA_LISTA = 100;

const MENSAGEM_EM_ANDAMENTO = "Já existe um backup em andamento.";

const MENSAGEM_SEM_SINAL =
  "Execução interrompida: sem sinal de vida do processo que a executava.";

const MENSAGEM_LIMITE =
  'O parâmetro "limite" deve ser um inteiro de 1 a 100.';


interface ExecucaoAtiva {
  id: number;
  nome: string;
  parcial: string;
  cancelar: (() => void) | null;
  sinalPerdido: boolean;
}


let ativa: ExecucaoAtiva | null = null;

const tentativas = { dia: "", repetir: false };


function paraResposta(execucao: BackupExecucaoCompleto): BackupRespostaDto {
  return {
    id: execucao.id,
    origem: execucao.origem,
    situacao: execucao.situacao,
    data_referencia:
      execucao.data_referencia === null
        ? null
        : formatarDia(execucao.data_referencia),
    iniciado_em: execucao.iniciado_em,
    finalizado_em: execucao.finalizado_em,
    arquivo: execucao.arquivo,
    tamanho_bytes:
      execucao.tamanho_bytes === null ? null : Number(execucao.tamanho_bytes),
    sha256: execucao.sha256,
    arquivo_removido_em: execucao.arquivo_removido_em,
    erro: execucao.erro,
    solicitado_por: execucao.solicitado_por,
    aviso_visto_em: execucao.aviso_visto_em,
    aviso_visto_por_id: execucao.aviso_visto_por_id,
  };
}


function registrar(mensagem: string): void {
  console.error("Backup: " + mensagem);
}


function nomeDoErro(erro: unknown): string {
  const e = erro as { name?: string; code?: string };

  return `${e?.name ?? "Error"} ${e?.code ?? ""}`.trim();
}


async function exigirConfiguracao(): Promise<ConfiguracaoDeBackup> {
  const resultado = await lerConfiguracaoDeBackup();

  if (!resultado.configurada) {
    throw new AppError(
      `Backup não configurado no servidor: ${resultado.motivo}`,
      503
    );
  }

  return resultado.valor;
}


async function emitirSinal(estado: ExecucaoAtiva): Promise<void> {
  try {
    const viva = await repository.sinalDeVida(estado.id);

    if (!viva) {
      estado.sinalPerdido = true;
      estado.cancelar?.();
    }
  }
  catch (erro) {
    registrar("falha temporária ao enviar o sinal de vida (" + nomeDoErro(erro) + ").");
  }
}


async function registrarFalha(id: number, texto: string): Promise<void> {
  try {
    await repository.falhar(id, { erro: texto });
  }
  catch (erro) {
    registrar("não foi possível registrar a falha (" + nomeDoErro(erro) + ").");
  }
}


async function limparArquivosDaExecucao(
  configuracao: ConfiguracaoDeBackup,
  estado: ExecucaoAtiva,
  incluirDefinitivo: boolean
): Promise<void> {
  try {
    await removerParcialDoSistema(configuracao.pasta, estado.nome);

    if (incluirDefinitivo) {
      await removerArquivoDoSistema(configuracao.pasta, estado.nome);
    }
  }
  catch (erro) {
    registrar("não foi possível limpar os arquivos da execução (" + nomeDoErro(erro) + ").");
  }
}


async function examinarPasta(configuracao: ConfiguracaoDeBackup) {
  const { arquivos, parciais } = await listarArquivosDoSistema(configuracao.pasta);
  const ativos = await repository.findConcluidosComArquivoAtivo();

  const registrados = new Set<string>();
  const ausentesRecentes: string[] = [];
  const ausentesAntigos: { id: number; arquivo: string }[] = [];

  ativos.forEach((registro, posicao) => {
    if (registro.arquivo === null) return;

    registrados.add(registro.arquivo);

    if (arquivos.has(registro.arquivo)) return;

    if (posicao < MANTER_COPIAS) {
      ausentesRecentes.push(registro.arquivo);
    }
    else {
      ausentesAntigos.push({ id: registro.id, arquivo: registro.arquivo });
    }
  });

  const emAndamento =
    ativa !== null || (await repository.findEmAndamento()) !== null;

  const semRegistro = emAndamento
    ? []
    : [...arquivos].filter((nome) => !registrados.has(nome)).sort();

  return { ausentesRecentes, ausentesAntigos, semRegistro, parciais };
}


export async function reconciliar(): Promise<ResultadoDaReconciliacao | null> {
  const resultado = await lerConfiguracaoDeBackup();

  if (!resultado.configurada) {
    return null;
  }

  const exame = await examinarPasta(resultado.valor);

  let marcados = 0;

  for (const registro of exame.ausentesAntigos) {
    const marcado = await repository.marcarArquivoRemovido(registro.id);

    if (marcado.situacao === "ok") {
      marcados += 1;
    }
  }

  return {
    marcados,
    ausentes: exame.ausentesRecentes,
    sem_registro: exame.semRegistro,
    parciais: exame.parciais,
  };
}


async function aplicarRetencao(configuracao: ConfiguracaoDeBackup): Promise<void> {
  const excedentes = await repository.findConcluidosAlemDosMaisRecentes(MANTER_COPIAS);

  for (const registro of excedentes) {
    if (registro.arquivo === null) continue;

    try {
      await removerArquivoDoSistema(configuracao.pasta, registro.arquivo);
      await repository.marcarArquivoRemovido(registro.id);
    }
    catch (erro) {
      registrar("retenção não concluída para um arquivo (" + nomeDoErro(erro) + ").");
    }
  }
}


async function concluirComRetencao(configuracao: ConfiguracaoDeBackup): Promise<void> {
  try {
    await aplicarRetencao(configuracao);
    await reconciliar();
  }
  catch (erro) {
    registrar("retenção ou reconciliação não concluída (" + nomeDoErro(erro) + ").");
  }
}


async function rodar(
  id: number,
  configuracao: ConfiguracaoDeBackup
): Promise<ResultadoDaExecucao> {
  const nome = nomeDoArquivo(new Date());
  const parcial = caminhoDoParcial(configuracao.pasta, nome);
  const definitivo = caminhoDoArquivo(configuracao.pasta, nome);

  const estado: ExecucaoAtiva = {
    id,
    nome,
    parcial,
    cancelar: null,
    sinalPerdido: false,
  };

  ativa = estado;

  const batimento = setInterval(() => {
    void emitirSinal(estado);
  }, INTERVALO_DO_SINAL_EM_MS);

  try {
    const dump = gerarDump(configuracao, parcial, TIMEOUT_DO_DUMP_EM_MS);
    estado.cancelar = dump.cancelar;

    const resultado = await dump.resultado;

    if (estado.sinalPerdido) {
      await limparArquivosDaExecucao(configuracao, estado, false);
      return "sinal_perdido";
    }

    if (resultado.codigo !== 0) {
      const motivo = resultado.expirou
        ? "pg_dump excedeu o tempo limite."
        : `pg_dump terminou com código ${resultado.codigo ?? "nenhum"}: ${resultado.erro}`;

      await limparArquivosDaExecucao(configuracao, estado, false);
      await registrarFalha(id, sanitizarErro(motivo, configuracao.segredos));
      return "falhou";
    }

    const problema = await validarDump(
      configuracao,
      parcial,
      TIMEOUT_DA_VALIDACAO_EM_MS
    );

    if (problema !== null) {
      await limparArquivosDaExecucao(configuracao, estado, false);
      await registrarFalha(id, sanitizarErro(problema, configuracao.segredos));
      return "falhou";
    }

    const [hash, tamanho] = await Promise.all([
      sha256DoArquivo(parcial),
      tamanhoDoArquivo(parcial),
    ]);

    if (tamanho <= 0n) {
      await limparArquivosDaExecucao(configuracao, estado, false);
      await registrarFalha(id, "O arquivo gerado está vazio.");
      return "falhou";
    }

    if (estado.sinalPerdido) {
      await limparArquivosDaExecucao(configuracao, estado, false);
      return "sinal_perdido";
    }

    await publicarArquivo(parcial, definitivo);

    const concluida = await repository.concluir(id, {
      arquivo: nome,
      tamanho_bytes: tamanho,
      sha256: hash,
    });

    if (concluida.situacao === "ok") {
      await concluirComRetencao(configuracao);
      return "concluido";
    }

    await limparArquivosDaExecucao(configuracao, estado, true);

    if (concluida.situacao === "arquivo_duplicado") {
      await registrarFalha(id, "Já existe um backup registrado com este nome.");
      return "falhou";
    }

    return "sinal_perdido";
  }
  catch (erro) {
    await limparArquivosDaExecucao(configuracao, estado, false);
    await registrarFalha(
      id,
      sanitizarErro(
        `Falha ao gerar o backup (${nomeDoErro(erro)}).`,
        configuracao.segredos
      )
    );
    return "falhou";
  }
  finally {
    clearInterval(batimento);

    if (ativa === estado) {
      ativa = null;
    }
  }
}


function lerLimite(query: Record<string, unknown>): number {
  const valor = query.limite;

  if (valor === undefined) {
    return LIMITE_PADRAO_DA_LISTA;
  }

  if (typeof valor !== "string" || !/^\d{1,3}$/.test(valor.trim())) {
    throw new BadRequestError(MENSAGEM_LIMITE);
  }

  const limite = Number(valor.trim());

  if (limite < 1 || limite > LIMITE_MAXIMO_DA_LISTA) {
    throw new BadRequestError(MENSAGEM_LIMITE);
  }

  return limite;
}


export async function findAll(
  query: Record<string, unknown>
): Promise<BackupRespostaDto[]> {
  const execucoes = await repository.findRecentes(lerLimite(query));

  return execucoes.map(paraResposta);
}


export async function iniciarManual(usuarioId: number): Promise<BackupRespostaDto> {
  const configuracao = await exigirConfiguracao();

  if (ativa !== null) {
    throw new ConflictError(MENSAGEM_EM_ANDAMENTO);
  }

  const inicio = await repository.iniciar({
    origem: OrigemBackup.MANUAL,
    solicitado_por_id: usuarioId,
  });

  if (inicio.situacao !== "ok") {
    throw new ConflictError(MENSAGEM_EM_ANDAMENTO);
  }

  void rodar(inicio.execucao.id, configuracao).catch((erro) => {
    registrar("execução manual terminou com erro inesperado (" + nomeDoErro(erro) + ").");
  });

  return paraResposta(inicio.execucao);
}


export async function aviso(): Promise<AvisoBackupRespostaDto> {
  const falhas = (await repository.findAvisosPendentes()).map(paraResposta);
  const resultado = await lerConfiguracaoDeBackup();

  if (!resultado.configurada) {
    return {
      configurada: false,
      motivo: resultado.motivo,
      falhas,
      arquivos_ausentes: [],
      arquivos_sem_registro: [],
    };
  }

  const exame = await examinarPasta(resultado.valor);

  return {
    configurada: true,
    motivo: null,
    falhas,
    arquivos_ausentes: exame.ausentesRecentes,
    arquivos_sem_registro: exame.semRegistro,
  };
}


export async function avisoParaLogin(): Promise<AvisoBackupLoginDto | null> {
  let falhas_pendentes: number | null = null;
  let configuracao: Awaited<ReturnType<typeof lerConfiguracaoDeBackup>> | null = null;

  try {
    falhas_pendentes = (await repository.findAvisosPendentes()).length;
  }
  catch (erro) {
    registrar("não foi possível consultar os avisos para o login (" + nomeDoErro(erro) + ").");
  }

  try {
    configuracao = await lerConfiguracaoDeBackup();
  }
  catch (erro) {
    registrar("não foi possível verificar a configuração do backup para o login (" + nomeDoErro(erro) + ").");
  }

  if (falhas_pendentes === null && configuracao === null) {
    return null;
  }

  const naoConfigurado = configuracao !== null && !configuracao.configurada;

  return {
    falhas_pendentes: falhas_pendentes ?? 0,
    backup_configurado: configuracao === null ? null : configuracao.configurada,
    ...(naoConfigurado
      ? {
          mensagem_configuracao:
            "O backup não está configurado no servidor e nenhuma cópia será feita até que isso seja corrigido. Consulte GET /backups/aviso para ver o motivo.",
        }
      : {}),
  };
}


export async function marcarVisto(
  id: number,
  usuarioId: number
): Promise<BackupRespostaDto> {
  validarId(id);

  const resultado = await repository.marcarVisto(id, usuarioId);

  switch (resultado.situacao) {
    case "ok":
      return paraResposta(resultado.execucao);
    case "nao_encontrada":
      throw new NotFoundError("Execução de backup não encontrada.");
    case "sem_aviso":
      throw new ConflictError("Esta execução não tem aviso de falha.");
    case "ja_visto":
      throw new ConflictError("O aviso desta execução já foi marcado como visto.");
  }
}


export async function aoIniciar(): Promise<void> {
  try {
    const resultado = await reconciliar();

    if (resultado && resultado.marcados > 0) {
      registrar(`${resultado.marcados} registro(s) reconciliado(s) na inicialização.`);
    }
  }
  catch (erro) {
    registrar("reconciliação da inicialização não concluída (" + nomeDoErro(erro) + ").");
  }
}


async function recuperarInterrompidas(
  configuracao: ConfiguracaoDeBackup,
  agora: Date
): Promise<void> {
  const limite = new Date(agora.getTime() - LIMITE_SEM_SINAL_EM_MS);
  const marcadas = await repository.marcarSemSinal(limite, MENSAGEM_SEM_SINAL);

  if (marcadas === 0) return;

  registrar(`${marcadas} execução(ões) sem sinal de vida marcada(s) como falha.`);

  if ((await repository.findEmAndamento()) !== null) return;

  const { parciais } = await listarArquivosDoSistema(configuracao.pasta);

  for (const parcial of parciais) {
    try {
      await removerParcialDoSistema(
        configuracao.pasta,
        parcial.replace(/\.parcial$/, "")
      );
    }
    catch (erro) {
      registrar("não foi possível remover um arquivo parcial (" + nomeDoErro(erro) + ").");
    }
  }
}


export async function verificarAgendamento(
  agora: Date = new Date()
): Promise<ResultadoDoAgendamento> {
  const resultado = await lerConfiguracaoDeBackup();

  if (!resultado.configurada) {
    return { acao: "nenhuma", detalhe: "nao_configurado" };
  }

  const configuracao = resultado.valor;

  if (ativa === null) {
    await recuperarInterrompidas(configuracao, agora);
  }

  const atual = await configuracaoRepository.find();

  if (!atual) {
    return { acao: "nenhuma", detalhe: "sem_configuracao" };
  }

  if (minutosDoDiaNoConsultorio(agora) < atual.backup_horario_min) {
    return { acao: "nenhuma", detalhe: "antes_do_horario" };
  }

  if (ativa !== null) {
    return { acao: "nenhuma", detalhe: "ocupado" };
  }

  const dia = diaCivilNoConsultorio(agora);
  const chave = formatarDia(dia);

  if ((await repository.findAgendadoDoDia(dia)) !== null) {
    return { acao: "nenhuma", detalhe: "ja_agendado" };
  }

  if (tentativas.dia === chave && !tentativas.repetir) {
    return { acao: "nenhuma", detalhe: "ja_tentou" };
  }

  tentativas.dia = chave;
  tentativas.repetir = false;

  const inicio = await repository.iniciar({
    origem: OrigemBackup.AGENDADO,
    data_referencia: dia,
  });

  if (inicio.situacao !== "ok") {
    return { acao: "nenhuma", detalhe: "ocupado" };
  }

  const execucao = await rodar(inicio.execucao.id, configuracao);

  if (execucao === "sinal_perdido") {
    tentativas.repetir = true;
  }

  return { acao: "executou", detalhe: execucao };
}
