import { useState } from 'react'
import type { FormEvent } from 'react'
import { ErroApi, chamarApi } from '../services/api'
import type { Usuario } from '../types/Usuario'

type LoginProps = {
  onEntrar: (usuario: Usuario) => void
}

export function Login({ onEntrar }: LoginProps) {
  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErro('')
    setEnviando(true)

    try {
      const resposta = await chamarApi<{ usuario: Usuario }>('/sessoes', {
        method: 'POST',
        body: JSON.stringify({ login, senha }),
      })

      onEntrar(resposta.usuario)
    }
    catch (e) {
      setErro(
        e instanceof ErroApi
          ? e.message
          : 'Não foi possível entrar. Tente novamente.',
      )
      setSenha('')
    }
    finally {
      setEnviando(false)
    }
  }

  return (
    <div className="row">
      <div className="col-12 col-md-6 col-lg-4">
        <h2 className="h5 mb-3">Entrar</h2>

        {erro && (
          <div className="alert alert-danger" role="alert">
            {erro}
          </div>
        )}

        <form onSubmit={enviar}>
          <div className="mb-3">
            <label htmlFor="login" className="form-label">
              Login
            </label>
            <input
              id="login"
              className="form-control"
              type="text"
              autoComplete="username"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <label htmlFor="senha" className="form-label">
              Senha
            </label>
            <input
              id="senha"
              className="form-control"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={enviando}>
            {enviando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
