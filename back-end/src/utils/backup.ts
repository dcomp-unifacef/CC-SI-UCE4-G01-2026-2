import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { link, lstat, mkdir, readdir, stat, unlink } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";


const FUSO_DO_CONSULTORIO = "America/Sao_Paulo";

const SCHEMA_DO_BANCO = "public";

const LIMITE_DE_SAIDA = 8 * 1024 * 1024;

const LIMITE_DE_ERRO = 4096;

const TABELAS_OBRIGATORIAS = [
  "Usuario",
  "Configuracao",
  "BackupExecucao",
  "_prisma_migrations",
];

const formatadorDoNome = new Intl.DateTimeFormat("sv-SE", {
  timeZone: FUSO_DO_CONSULTORIO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});


export const PADRAO_DO_ARQUIVO = /^odontosystem-\d{8}-\d{6}\.dump$/;

export const PADRAO_DO_PARCIAL = /^odontosystem-\d{8}-\d{6}\.dump\.parcial$/;


export interface ConfiguracaoDeBackup {
  pasta: string;
  pgDump: string;
  pgRestore: string;
  ambiente: NodeJS.ProcessEnv;
  segredos: string[];
  schema: string;
}


export type ResultadoDaConfiguracao =
  | { configurada: true; valor: ConfiguracaoDeBackup }
  | { configurada: false; motivo: string };


export interface ResultadoDaFerramenta {
  codigo: number | null;
  erro: string;
  saida: string;
  expirou: boolean;
}


export interface ProcessoEmExecucao {
  resultado: Promise<ResultadoDaFerramenta>;
  cancelar: () => void;
}


function raizDoProjeto(): string {
  return fileURLToPath(new URL("../../../", import.meta.url));
}


function estaDentroDe(pai: string, filho: string): boolean {
  const caminho = relative(resolve(pai), resolve(filho));

  return caminho === "" || (!caminho.startsWith("..") && !isAbsolute(caminho));
}


function extensaoDoExecutavel(): string {
  return process.platform === "win32" ? ".exe" : "";
}


function ambienteDaConexao(url: string): {
  ambiente: NodeJS.ProcessEnv;
  segredos: string[];
} | null {
  let endereco: URL;

  try {
    endereco = new URL(url);
  }
  catch {
    return null;
  }

  const usuario = decodeURIComponent(endereco.username);
  const senha = decodeURIComponent(endereco.password);
  const banco = decodeURIComponent(endereco.pathname.replace(/^\//, ""));

  if (!endereco.hostname || !usuario || !banco) {
    return null;
  }

  const ambiente: NodeJS.ProcessEnv = {
    ...process.env,
    PGHOST: endereco.hostname,
    PGPORT: endereco.port || "5432",
    PGUSER: usuario,
    PGPASSWORD: senha,
    PGDATABASE: banco,
  };

  delete ambiente.DATABASE_URL;

  const sslmode = endereco.searchParams.get("sslmode");

  if (sslmode) {
    ambiente.PGSSLMODE = sslmode;
  }

  return {
    ambiente,
    segredos: [senha, usuario, endereco.hostname].filter((valor) => valor.length >= 3),
  };
}


export async function lerConfiguracaoDeBackup(): Promise<ResultadoDaConfiguracao> {
  const pasta = process.env.BACKUP_DIR?.trim();
  const ferramentas = process.env.PG_BIN_DIR?.trim();
  const url = process.env.DATABASE_URL;

  if (!pasta || !ferramentas) {
    return {
      configurada: false,
      motivo: "BACKUP_DIR e PG_BIN_DIR precisam estar definidos no servidor.",
    };
  }

  if (!isAbsolute(pasta) || !isAbsolute(ferramentas)) {
    return {
      configurada: false,
      motivo: "BACKUP_DIR e PG_BIN_DIR devem ser caminhos absolutos.",
    };
  }

  if (estaDentroDe(raizDoProjeto(), pasta)) {
    return {
      configurada: false,
      motivo: "BACKUP_DIR deve ficar fora da pasta do projeto.",
    };
  }

  const pgDump = join(ferramentas, "pg_dump" + extensaoDoExecutavel());
  const pgRestore = join(ferramentas, "pg_restore" + extensaoDoExecutavel());

  try {
    const [dump, restore] = await Promise.all([stat(pgDump), stat(pgRestore)]);

    if (!dump.isFile() || !restore.isFile()) {
      throw new Error("ferramenta ausente");
    }
  }
  catch {
    return {
      configurada: false,
      motivo: "pg_dump e pg_restore não foram encontrados em PG_BIN_DIR.",
    };
  }

  const conexao = url ? ambienteDaConexao(url) : null;

  if (!conexao) {
    return {
      configurada: false,
      motivo: "DATABASE_URL ausente ou inválida.",
    };
  }

  try {
    await mkdir(pasta, { recursive: true });
  }
  catch {
    return {
      configurada: false,
      motivo: "Não foi possível acessar a pasta de backup.",
    };
  }

  return {
    configurada: true,
    valor: {
      pasta: resolve(pasta),
      pgDump,
      pgRestore,
      ambiente: conexao.ambiente,
      segredos: conexao.segredos,
      schema: SCHEMA_DO_BANCO,
    },
  };
}


export function nomeDoArquivo(instante: Date): string {
  const digitos = formatadorDoNome.format(instante).replace(/\D/g, "");

  return `odontosystem-${digitos.slice(0, 8)}-${digitos.slice(8, 14)}.dump`;
}


export function sanitizarErro(texto: string, segredos: string[]): string {
  let limpo = texto;

  for (const segredo of segredos) {
    limpo = limpo.split(segredo).join("***");
  }

  limpo = limpo.replace(/\s+/g, " ").trim().slice(0, 300);

  return limpo || "Falha sem detalhe.";
}


function executar(
  binario: string,
  argumentos: string[],
  ambiente: NodeJS.ProcessEnv,
  timeoutMs: number,
  guardarSaida: boolean
): ProcessoEmExecucao {
  const filho = spawn(binario, argumentos, {
    env: ambiente,
    shell: false,
    windowsHide: true,
    stdio: ["ignore", guardarSaida ? "pipe" : "ignore", "pipe"],
  });

  let erro = "";
  let saida = "";
  let expirou = false;

  filho.stderr?.on("data", (parte: Buffer) => {
    if (erro.length < LIMITE_DE_ERRO) {
      erro += parte.toString("utf8");
    }
  });

  filho.stdout?.on("data", (parte: Buffer) => {
    if (saida.length < LIMITE_DE_SAIDA) {
      saida += parte.toString("utf8");
    }
  });

  const resultado = new Promise<ResultadoDaFerramenta>((resolver) => {
    const temporizador = setTimeout(() => {
      expirou = true;
      filho.kill();
    }, timeoutMs);

    filho.on("error", (falha: NodeJS.ErrnoException) => {
      clearTimeout(temporizador);
      resolver({
        codigo: null,
        erro: falha.code ?? "falha ao iniciar o processo",
        saida,
        expirou,
      });
    });

    filho.on("close", (codigo) => {
      clearTimeout(temporizador);
      resolver({ codigo, erro, saida, expirou });
    });
  });

  return {
    resultado,
    cancelar: () => {
      filho.kill();
    },
  };
}


export function gerarDump(
  configuracao: ConfiguracaoDeBackup,
  destino: string,
  timeoutMs: number
): ProcessoEmExecucao {
  const { schema } = configuracao;

  return executar(
    configuracao.pgDump,
    [
      "--format=custom",
      `--schema=${schema}`,
      "--no-owner",
      "--no-privileges",
      `--exclude-table-data=${schema}."Sessao"`,
      `--file=${destino}`,
    ],
    configuracao.ambiente,
    timeoutMs,
    false
  );
}


export async function validarDump(
  configuracao: ConfiguracaoDeBackup,
  arquivo: string,
  timeoutMs: number
): Promise<string | null> {
  const { schema } = configuracao;

  const listagem = await executar(
    configuracao.pgRestore,
    ["--list", arquivo],
    configuracao.ambiente,
    timeoutMs,
    true
  ).resultado;

  if (listagem.codigo !== 0) {
    return `pg_restore não conseguiu ler o arquivo (código ${listagem.codigo ?? "nenhum"}).`;
  }

  for (const tabela of TABELAS_OBRIGATORIAS) {
    const definicao = new RegExp(`\\sTABLE ${schema} ${tabela}\\s`);
    const dados = new RegExp(`\\sTABLE DATA ${schema} ${tabela}\\s`);

    if (!definicao.test(listagem.saida) || !dados.test(listagem.saida)) {
      return `O arquivo não contém a tabela ${tabela}.`;
    }
  }

  return null;
}


export function sha256DoArquivo(caminho: string): Promise<string> {
  return new Promise((resolver, rejeitar) => {
    const hash = createHash("sha256");
    const leitura = createReadStream(caminho);

    leitura.on("data", (parte) => hash.update(parte));
    leitura.on("error", rejeitar);
    leitura.on("end", () => resolver(hash.digest("hex")));
  });
}


export async function tamanhoDoArquivo(caminho: string): Promise<bigint> {
  const informacao = await stat(caminho, { bigint: true });

  return informacao.size;
}


export function caminhoDoArquivo(pasta: string, nome: string): string {
  if (!PADRAO_DO_ARQUIVO.test(nome)) {
    throw new Error("Nome de arquivo fora do padrão do sistema.");
  }

  return join(pasta, nome);
}


export function caminhoDoParcial(pasta: string, nome: string): string {
  return caminhoDoArquivo(pasta, nome) + ".parcial";
}


export async function publicarArquivo(
  parcial: string,
  definitivo: string
): Promise<void> {
  await link(parcial, definitivo);
  await unlink(parcial);
}


export async function removerArquivoDoSistema(
  pasta: string,
  nome: string
): Promise<"removido" | "ausente"> {
  const caminho = caminhoDoArquivo(pasta, nome);

  let informacao;

  try {
    informacao = await lstat(caminho);
  }
  catch (erro) {
    if ((erro as NodeJS.ErrnoException).code === "ENOENT") {
      return "ausente";
    }

    throw erro;
  }

  if (!informacao.isFile()) {
    throw new Error("O item não é um arquivo comum.");
  }

  await unlink(caminho);

  return "removido";
}


export async function removerParcialDoSistema(
  pasta: string,
  nome: string
): Promise<void> {
  const caminho = caminhoDoParcial(pasta, nome);

  try {
    await unlink(caminho);
  }
  catch (erro) {
    if ((erro as NodeJS.ErrnoException).code !== "ENOENT") {
      throw erro;
    }
  }
}


export async function listarArquivosDoSistema(pasta: string): Promise<{
  arquivos: Set<string>;
  parciais: string[];
}> {
  const entradas = await readdir(pasta, { withFileTypes: true });

  const arquivos = new Set<string>();
  const parciais: string[] = [];

  for (const entrada of entradas) {
    if (!entrada.isFile()) continue;

    if (PADRAO_DO_ARQUIVO.test(entrada.name)) {
      arquivos.add(entrada.name);
    }
    else if (PADRAO_DO_PARCIAL.test(entrada.name)) {
      parciais.push(entrada.name);
    }
  }

  return { arquivos, parciais };
}
