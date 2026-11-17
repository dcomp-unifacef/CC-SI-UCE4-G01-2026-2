import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ErroApi, chamarApi, mensagemDoErro } from '../services/api'
import { formatarDiaCivil } from '../utils/datas'
import type { Usuario } from '../types/Usuario'
import type { Visita } from '../types/Visita'

type VisitasListProps = {
  usuario: Usuario
  onSessaoExpirada: () => void
}

type Resposta = {
  tentativa: number
  visitas: Visita[]
  erro: string
}

export function VisitasList({ usuario, onSessaoExpirada }: VisitasListProps) {
  const clinico = usuario.perfil !== 'SECRETARIA'

  const [filtro, setFiltro] = useState('')
  const [tentativa, setTentativa] = useState(0)
  const [resposta, setResposta] = useState<Resposta | null>(null)

  const carregando = resposta === null || resposta.tentativa !== tentativa

  useEffect(() => {
    let ativo = true

    chamarApi<Visita[]>('/historico-visitas')
      .then((lista) => {
        if (ativo) {
          setResposta({ tentativa, visitas: lista, erro: '' })
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
          visitas: [],
          erro: mensagemDoErro(
            e,
            'Não foi possível carregar as visitas. Tente novamente.',
          ),
        })
      })

    return () => {
      ativo = false
    }
  }, [tentativa, onSessaoExpirada])

  const todas = carregando ? [] : resposta.visitas
  const erro = carregando ? '' : resposta.erro

  const termo = filtro.trim().toLowerCase()
  const visitas =
    termo === ''
      ? todas
      : todas.filter((visita) =>
          visita.paciente.nome.toLowerCase().includes(termo),
        )

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="h5 mb-0">Histórico de visitas</h2>

        {clinico && (
          <Link to="/visitas/nova" className="btn btn-primary btn-sm">
            Nova visita
          </Link>
        )}
      </div>

      <div className="row g-2 mb-3">
        <div className="col-12 col-md-5">
          <label htmlFor="filtro" className="form-label">
            Filtrar por nome do paciente
          </label>
          <input
            id="filtro"
            className="form-control"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
        </div>
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

      {!carregando && !erro && visitas.length === 0 && (
        <p className="text-secondary">Nenhuma visita encontrada.</p>
      )}

      {!carregando && !erro && visitas.length > 0 && (
        <table className="table table-striped table-sm align-middle">
          <thead>
            <tr>
              <th>Data</th>
              <th>Paciente</th>
              <th>Dentista</th>
              <th>Procedimento</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visitas.map((visita) => (
              <tr key={visita.id}>
                <td>{formatarDiaCivil(visita.data_visita)}</td>
                <td>{visita.paciente.nome}</td>
                <td>{visita.dentista.nome}</td>
                <td>
                  {clinico
                    ? visita.procedimento
                    : visita.procedimento_exibicao}
                </td>
                <td>
                  <div className="d-flex gap-1 justify-content-end">
                    <Link
                      to={`/visitas/${visita.id}`}
                      className="btn btn-outline-primary btn-sm"
                    >
                      Ver
                    </Link>

                    {clinico && (
                      <Link
                        to={`/visitas/${visita.id}/editar`}
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
