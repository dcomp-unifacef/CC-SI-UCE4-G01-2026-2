import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ErroApi, chamarApi, mensagemDoErro } from '../services/api'
import { rotuloPerfil } from '../utils/formatos'
import type { UsuarioAdmin } from '../types/UsuarioAdmin'

type UsuariosListProps = {
  onSessaoExpirada: () => void
}

type Resposta = {
  tentativa: number
  usuarios: UsuarioAdmin[]
  erro: string
}

export function UsuariosList({ onSessaoExpirada }: UsuariosListProps) {
  const [tentativa, setTentativa] = useState(0)
  const [resposta, setResposta] = useState<Resposta | null>(null)

  const carregando = resposta === null || resposta.tentativa !== tentativa

  useEffect(() => {
    let ativo = true

    chamarApi<UsuarioAdmin[]>('/usuarios')
      .then((lista) => {
        if (ativo) {
          setResposta({ tentativa, usuarios: lista, erro: '' })
        }
      })
      .catch((e) => {
        if (!ativo) {
          return
        }

        if (e instanceof ErroApi && e.status === 401) {
          onSessaoExpirada()
          return
        }

        setResposta({
          tentativa,
          usuarios: [],
          erro: mensagemDoErro(
            e,
            'Não foi possível carregar os usuários. Tente novamente.',
          ),
        })
      })

    return () => {
      ativo = false
    }
  }, [tentativa, onSessaoExpirada])

  const usuarios = carregando ? [] : resposta.usuarios
  const erro = carregando ? '' : resposta.erro

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="h5 mb-0">Usuários</h2>

        <Link to="/usuarios/novo" className="btn btn-primary btn-sm">
          Novo usuário
        </Link>
      </div>

      {erro && (
        <div
          className="alert alert-danger d-flex justify-content-between align-items-center"
          role="alert"
        >
          <span>{erro}</span>
          <button
            type="button"
            className="btn btn-outline-danger btn-sm"
            onClick={() => setTentativa(tentativa + 1)}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {carregando && <p className="text-secondary">Carregando...</p>}

      {!carregando && !erro && usuarios.length === 0 && (
        <p className="text-secondary">Nenhum usuário cadastrado.</p>
      )}

      {!carregando && !erro && usuarios.length > 0 && (
        <table className="table table-striped table-sm align-middle">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Login</th>
              <th>Perfil</th>
              <th>Situação</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((usuario) => (
              <tr key={usuario.id}>
                <td>{usuario.nome}</td>
                <td>{usuario.login}</td>
                <td>{rotuloPerfil(usuario.perfil)}</td>
                <td>{usuario.ativo ? 'Ativo' : 'Desativado'}</td>
                <td>
                  <div className="d-flex gap-1 justify-content-end">
                    <Link
                      to={`/usuarios/${usuario.id}`}
                      className="btn btn-outline-primary btn-sm"
                    >
                      Ver
                    </Link>
                    <Link
                      to={`/usuarios/${usuario.id}/editar`}
                      className="btn btn-outline-secondary btn-sm"
                    >
                      Editar
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
