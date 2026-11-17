import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ErroApi, chamarApi, mensagemDoErro } from '../services/api'
import type { Dentista } from '../types/Dentista'
import type { Usuario } from '../types/Usuario'

type DentistasListProps = {
  usuario: Usuario
  onSessaoExpirada: () => void
}

type Resposta = {
  tentativa: number
  dentistas: Dentista[]
  erro: string
}

export function DentistasList({ usuario, onSessaoExpirada }: DentistasListProps) {
  const dono = usuario.perfil === 'DONO'

  const [tentativa, setTentativa] = useState(0)
  const [resposta, setResposta] = useState<Resposta | null>(null)

  const carregando = resposta === null || resposta.tentativa !== tentativa

  useEffect(() => {
    let ativo = true

    chamarApi<Dentista[]>('/dentistas')
      .then((lista) => {
        if (ativo) {
          setResposta({ tentativa, dentistas: lista, erro: '' })
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
          dentistas: [],
          erro: mensagemDoErro(
            e,
            'Não foi possível carregar os dentistas. Tente novamente.',
          ),
        })
      })

    return () => {
      ativo = false
    }
  }, [tentativa, onSessaoExpirada])

  const dentistas = carregando ? [] : resposta.dentistas
  const erro = carregando ? '' : resposta.erro

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="h5 mb-0">Dentistas</h2>

        {dono && (
          <Link to="/dentistas/novo" className="btn btn-primary btn-sm">
            Novo dentista
          </Link>
        )}
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

      {!carregando && !erro && dentistas.length === 0 && (
        <p className="text-secondary">Nenhum dentista cadastrado.</p>
      )}

      {!carregando && !erro && dentistas.length > 0 && (
        <table className="table table-striped table-sm align-middle">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Situação</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {dentistas.map((dentista) => (
              <tr key={dentista.id}>
                <td>{dentista.nome}</td>
                <td>{dentista.ativo ? 'Ativo' : 'Desativado'}</td>
                <td>
                  <div className="d-flex gap-1 justify-content-end">
                    <Link
                      to={`/dentistas/${dentista.id}`}
                      className="btn btn-outline-primary btn-sm"
                    >
                      Ver
                    </Link>

                    {dono && (
                      <Link
                        to={`/dentistas/${dentista.id}/editar`}
                        className="btn btn-outline-secondary btn-sm"
                      >
                        Editar
                      </Link>
                    )}
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
