const apiBase = import.meta.env.VITE_API_BASE

const MENSAGEM_SEM_CONEXAO =
  'Não foi possível conectar ao servidor. Verifique se a API está em execução.'

export class ErroApi extends Error {
  status: number

  constructor(status: number, mensagem: string) {
    super(mensagem)
    this.status = status
  }
}

function mensagemPadrao(status: number): string {
  if (status === 401) {
    return 'Sua sessão expirou. Entre novamente.'
  }

  if (status === 403) {
    return 'Você não tem permissão para esta operação.'
  }

  if (status === 503) {
    return 'O serviço está indisponível no momento. Tente novamente.'
  }

  return 'Não foi possível concluir a operação. Tente novamente.'
}

function lerMensagem(corpo: unknown): string | null {
  if (typeof corpo === 'object' && corpo !== null && 'message' in corpo) {
    const mensagem = (corpo as { message: unknown }).message

    if (typeof mensagem === 'string' && mensagem !== '') {
      return mensagem
    }
  }

  return null
}

export async function chamarApi<T>(
  caminho: string,
  opcoes: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {}

  if (opcoes.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  let resposta: Response

  try {
    resposta = await fetch(`${apiBase}${caminho}`, {
      ...opcoes,
      credentials: 'include',
      headers,
    })
  }
  catch {
    throw new ErroApi(0, MENSAGEM_SEM_CONEXAO)
  }

  if (resposta.status === 204) {
    return undefined as T
  }

  let corpo: unknown = null

  try {
    corpo = await resposta.json()
  }
  catch {
    corpo = null
  }

  if (resposta.ok) {
    return corpo as T
  }

  throw new ErroApi(
    resposta.status,
    lerMensagem(corpo) ?? mensagemPadrao(resposta.status),
  )
}
