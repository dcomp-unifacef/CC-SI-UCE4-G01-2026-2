import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { ErroApi, chamarApi, mensagemDoErro } from '../services/api'
import { formatarDataHora } from '../utils/datas'
import { rotuloPerfil } from '../utils/formatos'
import type { Usuario } from '../types/Usuario'
import type { UsuarioAdmin } from '../types/UsuarioAdmin'

type UsuarioFichaProps = {
  usuario: Usuario
  alvo: UsuarioAdmin
  onRecarregar: () => void
  onSessaoExpirada: () => void
}

export function UsuarioFicha({
  usuario,
  alvo,
  onRecarregar,
  onSessaoExpirada,
}: UsuarioFichaProps) {
  const proprio = usuario.id === alvo.id

  const [confirmando, setConfirmando] = useState(false)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erroSenha, setErroSenha] = useState('')
  const [sucessoSenha, setSucessoSenha] = useState('')
  const [enviandoSenha, setEnviandoSenha] = useState(false)

  async function alterarSituacao() {
    setErro('')
    setEnviando(true)

    try {
      await chamarApi<UsuarioAdmin>(`/usuarios/${alvo.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ativo: !alvo.ativo }),
      })

      setConfirmando(false)
      onRecarregar()
    }
    catch (e) {
      if (e instanceof ErroApi && e.status === 401) {
        onSessaoExpirada()
        return
      }

      setConfirmando(false)
      setErro(mensagemDoErro(e, 'Não foi possível alterar o usuário.'))
    }
    finally {
      setEnviando(false)
    }
  }

  async function redefinirSenha(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErroSenha('')
    setSucessoSenha('')

    if (senha !== confirmacao) {
      setErroSenha('A confirmação da senha não confere.')
      return
    }

    setEnviandoSenha(true)

    try {
      await chamarApi<void>(`/usuarios/${alvo.id}/senha`, {
        method: 'PATCH',
        body: JSON.stringify({ senha }),
      })

      setSenha('')
      setConfirmacao('')
      setSucessoSenha(
        'Senha redefinida. As sessões abertas deste usuário foram encerradas.',
      )
    }
    catch (e) {
      if (e instanceof ErroApi && e.status === 401) {
        onSessaoExpirada()
        return
      }

      setErroSenha(mensagemDoErro(e, 'Não foi possível redefinir a senha.'))
    }
    finally {
      setEnviandoSenha(false)
    }
  }

  return (
    <>
      {erro && (
        <div className="alert alert-danger" role="alert">
          {erro}
        </div>
      )}

      <dl className="row">
        <dt className="col-sm-3">Nome</dt>
        <dd className="col-sm-9">{alvo.nome}</dd>
        <dt className="col-sm-3">Login</dt>
        <dd className="col-sm-9">{alvo.login}</dd>
        <dt className="col-sm-3">Perfil</dt>
        <dd className="col-sm-9">{rotuloPerfil(alvo.perfil)}</dd>
        <dt className="col-sm-3">Situação</dt>
        <dd className="col-sm-9">{alvo.ativo ? 'Ativo' : 'Desativado'}</dd>
        <dt className="col-sm-3">Criado em</dt>
        <dd className="col-sm-9">{formatarDataHora(alvo.criado_em)}</dd>
        <dt className="col-sm-3">Atualizado em</dt>
        <dd className="col-sm-9">{formatarDataHora(alvo.atualizado_em)}</dd>
      </dl>

      {confirmando && (
        <div className="alert alert-warning" role="alert">
          <p className="mb-2">
            Desativar este usuário encerra as sessões abertas dele e impede novos
            acessos.
            {proprio && ' Este é o seu próprio usuário: você será desconectado.'}
          </p>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-danger btn-sm"
              disabled={enviando}
              onClick={alterarSituacao}
            >
              {enviando ? 'Aguarde...' : 'Confirmar desativação'}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              disabled={enviando}
              onClick={() => setConfirmando(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="d-flex gap-2">
        <Link to={`/usuarios/${alvo.id}/editar`} className="btn btn-primary">
          Editar
        </Link>

        {alvo.ativo ? (
          <button
            type="button"
            className="btn btn-outline-danger"
            disabled={confirmando}
            onClick={() => {
              setErro('')
              setConfirmando(true)
            }}
          >
            Desativar
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-outline-success"
            disabled={enviando}
            onClick={alterarSituacao}
          >
            {enviando ? 'Aguarde...' : 'Reativar'}
          </button>
        )}

        <Link to="/usuarios" className="btn btn-outline-secondary">
          Voltar
        </Link>
      </div>

      <hr />

      <h3 className="h6">Redefinir senha</h3>

      {proprio ? (
        <p className="text-secondary">
          A redefinição pelo dono vale para outros usuários. A troca da própria
          senha, que exige a senha atual, não está nesta tela.
        </p>
      ) : (
        <form onSubmit={redefinirSenha} noValidate>
          {erroSenha && (
            <div className="alert alert-danger" role="alert">
              {erroSenha}
            </div>
          )}

          {sucessoSenha && (
            <div className="alert alert-success" role="status">
              {sucessoSenha}
            </div>
          )}

          <div className="row g-3">
            <div className="col-12 col-md-4">
              <label htmlFor="nova-senha" className="form-label">
                Nova senha
              </label>
              <input
                id="nova-senha"
                type="password"
                className="form-control"
                autoComplete="new-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </div>

            <div className="col-12 col-md-4">
              <label htmlFor="confirmacao-senha" className="form-label">
                Confirmar nova senha
              </label>
              <input
                id="confirmacao-senha"
                type="password"
                className="form-control"
                autoComplete="new-password"
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-3">
            <button
              type="submit"
              className="btn btn-outline-primary"
              disabled={enviandoSenha}
            >
              {enviandoSenha ? 'Salvando...' : 'Redefinir senha'}
            </button>
          </div>
        </form>
      )}
    </>
  )
}
