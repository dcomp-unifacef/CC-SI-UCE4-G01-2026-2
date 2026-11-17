import { useState } from 'react'
import type { FormEvent } from 'react'
import { ErroApi, chamarApi, mensagemDoErro } from '../services/api'

type TrocarSenhaProps = {
  onSenhaTrocada: () => void
  onSessaoExpirada: () => void
}

export function TrocarSenha({
  onSenhaTrocada,
  onSessaoExpirada,
}: TrocarSenhaProps) {
  const [senhaAtual, setSenhaAtual] = useState('')
  const [senhaNova, setSenhaNova] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErro('')

    if (senhaNova !== confirmacao) {
      setErro('A confirmação da nova senha não confere.')
      return
    }

    setEnviando(true)

    try {
      await chamarApi<void>('/usuarios/atual/senha', {
        method: 'PATCH',
        body: JSON.stringify({ senha_atual: senhaAtual, senha: senhaNova }),
      })

      onSenhaTrocada()
    }
    catch (e) {
      if (e instanceof ErroApi && e.status === 401) {
        onSessaoExpirada()
        return
      }

      setErro(mensagemDoErro(e, 'Não foi possível alterar a senha.'))
    }
    finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <h2 className="h5 mb-3">Alterar minha senha</h2>

      <p className="text-secondary">
        Ao alterar a senha, todas as suas sessões abertas são encerradas e você
        precisará entrar novamente com a nova senha.
      </p>

      <form onSubmit={enviar} noValidate>
        {erro && (
          <div className="alert alert-danger" role="alert">
            {erro}
          </div>
        )}

        <div className="row g-3">
          <div className="col-12 col-md-4">
            <label htmlFor="senha-atual" className="form-label">
              Senha atual
            </label>
            <input
              id="senha-atual"
              type="password"
              className="form-control"
              autoComplete="current-password"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
            />
          </div>

          <div className="col-12 col-md-4">
            <label htmlFor="senha-nova" className="form-label">
              Nova senha
            </label>
            <input
              id="senha-nova"
              type="password"
              className="form-control"
              autoComplete="new-password"
              value={senhaNova}
              onChange={(e) => setSenhaNova(e.target.value)}
            />
            <div className="form-text">De 8 a 128 caracteres.</div>
          </div>

          <div className="col-12 col-md-4">
            <label htmlFor="senha-confirmacao" className="form-label">
              Confirmar nova senha
            </label>
            <input
              id="senha-confirmacao"
              type="password"
              className="form-control"
              autoComplete="new-password"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-3">
          <button type="submit" className="btn btn-primary" disabled={enviando}>
            {enviando ? 'Salvando...' : 'Alterar senha'}
          </button>
        </div>
      </form>
    </>
  )
}
