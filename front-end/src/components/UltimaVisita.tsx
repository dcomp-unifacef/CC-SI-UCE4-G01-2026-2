import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ErroApi, chamarApi, mensagemDoErro } from '../services/api'
import { formatarDiaCivil } from '../utils/datas'
import type { UltimaVisita as UltimaVisitaDados } from '../types/UltimaVisita'

type UltimaVisitaProps = {
  pacienteId: number
  onSessaoExpirada: () => void
}

type Resposta = {
  pacienteId: number
  tentativa: number
  dados: UltimaVisitaDados | null
  erro: string
}

export function UltimaVisita({ pacienteId, onSessaoExpirada }: UltimaVisitaProps) {
  const [tentativa, setTentativa] = useState(0)
  const [resposta, setResposta] = useState<Resposta | null>(null)

  const carregando =
    resposta === null ||
    resposta.pacienteId !== pacienteId ||
    resposta.tentativa !== tentativa

  useEffect(() => {
    let ativo = true

    chamarApi<UltimaVisitaDados>(`/pacientes/${pacienteId}/ultima-visita`)
      .then((dados) => {
        if (ativo) {
          setResposta({ pacienteId, tentativa, dados, erro: '' })
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
          pacienteId,
          tentativa,
          dados: null,
          erro: mensagemDoErro(e, 'Não foi possível carregar a última visita.'),
        })
      })

    return () => {
      ativo = false
    }
  }, [pacienteId, tentativa, onSessaoExpirada])

  const dados = carregando ? null : resposta.dados
  const erro = carregando ? '' : resposta.erro

  return (
    <section className="mt-4">
      <h3 className="h6">Última visita</h3>

      {carregando && <p className="text-secondary">Carregando...</p>}

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

      {dados !== null && dados.sem_historico && (
        <p>
          <span className="badge text-bg-secondary">Sem histórico</span>{' '}
          Nenhuma visita registrada para este paciente.
        </p>
      )}

      {dados !== null && dados.ultima_visita !== null && (
        <p>
          <Link to={`/visitas/${dados.ultima_visita.id}`}>
            {formatarDiaCivil(dados.ultima_visita.data_visita)}
          </Link>{' '}
          com {dados.ultima_visita.dentista.nome}, há {dados.meses_desde}{' '}
          {dados.meses_desde === 1 ? 'mês' : 'meses'} ({dados.dias_desde}{' '}
          {dados.dias_desde === 1 ? 'dia' : 'dias'}).{' '}
          {dados.acima_de_6_meses ? (
            <span className="badge text-bg-warning">
              Mais de 6 meses sem atendimento
            </span>
          ) : (
            <span className="badge text-bg-success">Em dia</span>
          )}
        </p>
      )}
    </section>
  )
}
