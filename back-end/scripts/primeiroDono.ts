import { prisma } from "../src/database/client.ts";
import * as usuarioRepository from "../src/repositories/usuarioRepository.ts";
import { gerarHashSenha, validarSenha } from "../src/utils/senha.ts";
import { normalizarLogin } from "../src/utils/login.ts";
import { BadRequestError } from "../src/errors/BadRequestError.ts";


class Cancelado extends Error {}

const TENTATIVAS = 3;

let modoRawAtivo = false;


function restaurarTerminal(): void {
  if (modoRawAtivo && typeof process.stdin.setRawMode === "function") {
    try {
      process.stdin.setRawMode(false);
    }
    catch {}
  }

  modoRawAtivo = false;
  process.stdin.pause();
}

process.on("exit", restaurarTerminal);


function lerCampo(pergunta: string, oculto: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    const entrada = process.stdin;
    let texto = "";

    function finalizar(acao: () => void): void {
      entrada.removeListener("data", aoReceber);
      restaurarTerminal();
      process.stdout.write("\n");
      acao();
    }

    function aoReceber(trecho: string): void {
      if (trecho.startsWith("\u001b")) return;

      for (const c of trecho) {
        if (c === "\r" || c === "\n") {
          finalizar(() => resolve(texto));
          return;
        }

        if (c === "\u0003" || c === "\u0004") {
          finalizar(() => reject(new Cancelado()));
          return;
        }

        if (c === "\u007f" || c === "\b") {
          if (texto.length > 0) {
            texto = Array.from(texto).slice(0, -1).join("");
            if (!oculto) process.stdout.write("\b \b");
          }
          continue;
        }

        if (c < " ") continue;

        texto += c;
        if (!oculto) process.stdout.write(c);
      }
    }

    process.stdout.write(pergunta);
    entrada.setEncoding("utf8");
    entrada.setRawMode(true);
    modoRawAtivo = true;
    entrada.resume();
    entrada.on("data", aoReceber);
  });
}


async function perguntar<T>(
  pergunta: string,
  validar: (valor: string) => T
): Promise<T> {
  for (let i = 0; i < TENTATIVAS; i++) {
    const valor = await lerCampo(pergunta, false);

    try {
      return validar(valor);
    }
    catch (erro) {
      if (!(erro instanceof BadRequestError)) throw erro;
      console.log(erro.message);
    }
  }

  throw new BadRequestError("Número máximo de tentativas excedido.");
}


async function perguntarSenha(): Promise<string> {
  for (let i = 0; i < TENTATIVAS; i++) {
    const senha = await lerCampo("Senha (8 a 128 caracteres): ", true);

    try {
      validarSenha(senha);
    }
    catch (erro) {
      if (!(erro instanceof BadRequestError)) throw erro;
      console.log(erro.message);
      continue;
    }

    const confirmacao = await lerCampo("Confirme a senha: ", true);

    if (senha !== confirmacao) {
      console.log("As senhas não conferem.");
      continue;
    }

    return senha;
  }

  throw new BadRequestError("Número máximo de tentativas excedido.");
}


async function main(): Promise<void> {
  if (
    !process.stdin.isTTY ||
    !process.stdout.isTTY ||
    typeof process.stdin.setRawMode !== "function"
  ) {
    console.error(
      "Este script precisa de um terminal interativo: a senha não pode ser lida de outra forma."
    );
    process.exitCode = 1;
    return;
  }

  if (await usuarioRepository.contarUsuarios() > 0) {
    console.log("O sistema já está configurado. Nenhum usuário foi criado.");
    return;
  }

  console.log("Configuração inicial do OdontoSystem: criação do primeiro usuário (perfil DONO).");
  console.log("A senha é digitada sem aparecer na tela. Ctrl+C cancela.\n");

  const nome = await perguntar("Nome completo: ", (valor) => {
    const texto = valor.trim();

    if (texto === "") {
      throw new BadRequestError('O campo "nome" é obrigatório.');
    }

    return texto;
  });

  const login = await perguntar("Login: ", normalizarLogin);
  const senha = await perguntarSenha();

  console.log("Gerando o hash da senha...");
  const senha_hash = await gerarHashSenha(senha);

  const criado = await usuarioRepository.criarPrimeiroDono({ nome, login, senha_hash });

  if (criado === null) {
    console.log("O sistema já está configurado. Nenhum usuário foi criado.");
    return;
  }

  console.log(`Dono criado com sucesso (id ${criado.id}, login "${criado.login}").`);
}


main()
  .catch((erro: unknown) => {
    if (erro instanceof Cancelado) {
      console.error("Operação cancelada. Nenhum usuário foi criado.");
    }
    else if (erro instanceof BadRequestError) {
      console.error(erro.message);
    }
    else {
      const codigo = (erro as { code?: string } | null)?.code;
      const tipo = erro instanceof Error ? erro.name : "desconhecido";
      console.error(`Falha ao criar o primeiro dono (detalhes omitidos). Tipo: ${tipo}${codigo ? `, código: ${codigo}` : ""}.`);
    }

    process.exitCode = 1;
  })
  .finally(async () => {
    restaurarTerminal();
    await prisma.$disconnect();
  });
