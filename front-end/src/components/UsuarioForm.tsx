import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { ErroApi, chamarApi, mensagemDoErro } from '../services/api'
import { rotuloPerfil } from '../utils/formatos'
import type { UsuarioAdmin } from '../types/UsuarioAdmin'

type UsuarioFormProps = {
  alvo?: UsuarioAdmin
  onSessaoExpirada: () => void
}

const PERFIS: UsuarioAdmin['perfil'][] = ['DONO', 'DENTISTA', 'SECRETARIA']

export function UsuarioForm({ alvo, onSessaoExpirada }: UsuarioFormProps) {
  const navigate = useNavigate()
  const edicao = alvo !== undefined

  const [nome, setNome] = useState(alvo?.nome ?? '')
  const [login, setLogin] = useState(alvo?.login ?? '')
  const [senha, setSenha] = useState('')
  const [perfil, setPerfil] = useState<string>(alvo?.perfil ?? 'SECRETARIA')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErro('')
    setEnviando(true)

    try {
      const salvo = await chamarApi<UsuarioAdmin>(
        edicao ? `/usuarios/${alvo.id}` : '/usuarios',
        {
          method: edicao ? 'PATCH' : 'POST',
          body: JSON.stringify(
            edicao ? { nome, perfil } : { nome, login, senha, perfil },
          ),
        },
      )

      navigate(`/usuarios/${salvo.id}`)
    }
    catch (e) {
      if (e instanceof ErroApi && e.status === 401) {
        onSessaoExpirada()
        return
      }

      setErro(
        mensagemDoErro(
          e,
          edicao
            ? 'Não foi possível salvar o usuário.'
            : 'Não foi possível cadastrar o usuário.',
        ),
      )
    }
    finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} noValidate>
      {erro && (
        <div className="alert alert-danger" role="alert">
          {erro}
        </div>
      )}

      <div className="row g-3">
        <div className="col-12 col-md-6">
          <label htmlFor="nome" className="form-label">
            Nome
          </label>
          <input
            id="nome"
            className="form-control"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>

        <div className="col-12 col-md-6">
          <label htmlFor="login" className="form-label">
            Login
          </label>
          <input
            id="login"
            className="form-control"
            autoComplete="off"
            value={login}
            disabled={edicao}
            onChange={(e) => setLogin(e.target.value)}
          />
          {edicao && (
            <div className="form-text">O login não pode ser alterado.</div>
          )}
        </div>

        {!edicao && (
          <div className="col-12 col-md-6">
            <label htmlFor="senha" className="form-label">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              className="form-control"
              autoComplete="new-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
            <div className="form-text">De 8 a 128 caracteres.</div>
          </div>
        )}

        <div className="col-12 col-md-4">
          <label htmlFor="perfil" className="form-label">
            Perfil
          </label>
          <select
            id="perfil"
            className="form-select"
            value={perfil}
            onChange={(e) => setPerfil(e.target.value)}
          >
            {PERFIS.map((item) => (
              <option key={item} value={item}>
                {rotuloPerfil(item)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3 d-flex gap-2">
        <button type="submit" className="btn btn-primary" disabled={enviando}>
          {enviando ? 'Salvando...' : edicao ? 'Salvar' : 'Cadastrar'}
        </button>
        <Link
          to={edicao ? `/usuarios/${alvo.id}` : '/usuarios'}
          className="btn btn-outline-secondary"
        >
          Voltar
        </Link>
      </div>
    </form>
  )
}
