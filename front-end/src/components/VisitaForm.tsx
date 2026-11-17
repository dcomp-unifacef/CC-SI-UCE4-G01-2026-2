import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { ErroApi, chamarApi, mensagemDoErro } from '../services/api'
import { hoje } from '../utils/datas'
import { PacienteBusca } from './PacienteBusca'
import type { Dentista } from '../types/Dentista'
import type { Paciente } from '../types/Paciente'
import type { Procedimento } from '../types/Procedimento'
import type { Visita } from '../types/Visita'

type VisitaFormProps = {
  visita?: Visita
  onSessaoExpirada: () => void
}

export function VisitaForm({ visita, onSessaoExpirada }: VisitaFormProps) {
  const navigate = useNavigate()
  const edicao = visita !== undefined

  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [dentistas, setDentistas] = useState<Dentista[]>([])
  const [dentistaId, setDentistaId] = useState('')
  const [catalogo, setCatalogo] = useState<Procedimento[] | null>(null)
  const [catalogoId, setCatalogoId] = useState(
    visita?.procedimento_id === null || visita === undefined
      ? ''
      : String(visita.procedimento_id),
  )
  const [data, setData] = useState(
    visita !== undefined ? visita.data_visita.slice(0, 10) : hoje(),
  )
  const [procedimento, setProcedimento] = useState(visita?.procedimento ?? '')
  const [observacoes, setObservacoes] = useState(visita?.observacoes ?? '')
  const [antigo, setAntigo] = useState(false)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    let ativo = true

    chamarApi<Procedimento[]>('/procedimentos?ativo=true')
      .then((lista) => {
        if (ativo) {
          setCatalogo(lista)
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

        setErro(mensagemDoErro(e, 'Não foi possível carregar o catálogo.'))
      })

    if (!edicao) {
      chamarApi<Dentista[]>('/dentistas')
        .then((lista) => {
          if (ativo) {
            setDentistas(lista)
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

          setErro(mensagemDoErro(e, 'Não foi possível carregar os dentistas.'))
        })
    }

    return () => {
      ativo = false
    }
  }, [edicao, onSessaoExpirada])

  function escolherCatalogo(valor: string) {
    setCatalogoId(valor)

    const item = (catalogo ?? []).find(
      (procedimentoItem) => String(procedimentoItem.id) === valor,
    )

    if (item !== undefined) {
      setProcedimento(item.nome)
    }
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErro('')

    if (!edicao && paciente === null) {
      setErro('Busque e selecione o paciente.')
      return
    }

    if (!edicao && dentistaId === '') {
      setErro('Selecione o dentista.')
      return
    }

    const corpo: Record<string, unknown> = {
      data_visita: data,
      procedimento,
      observacoes,
      procedimento_id: catalogoId === '' ? null : Number(catalogoId),
    }

    if (!edicao && paciente !== null) {
      corpo.paciente_id = paciente.id
      corpo.dentista_id = Number(dentistaId)
    }

    setEnviando(true)

    try {
      const caminho = edicao
        ? `/historico-visitas/${visita.id}`
        : antigo
          ? '/historico-visitas/antigos'
          : '/historico-visitas'

      const salva = await chamarApi<Visita>(caminho, {
        method: edicao ? 'PATCH' : 'POST',
        body: JSON.stringify(corpo),
      })

      navigate(`/visitas/${salva.id}`)
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
            ? 'Não foi possível salvar a visita.'
            : 'Não foi possível registrar a visita.',
        ),
      )
    }
    finally {
      setEnviando(false)
    }
  }

  const vinculoFora =
    catalogo !== null &&
    visita?.procedimentoCatalogo != null &&
    !catalogo.some((item) => item.id === visita.procedimentoCatalogo?.id)

  return (
    <form onSubmit={enviar} noValidate>
      {erro && (
        <div className="alert alert-danger" role="alert">
          {erro}
        </div>
      )}

      <div className="row g-3">
        {edicao ? (
          <div className="col-12">
            <p className="mb-0">
              Paciente: <strong>{visita.paciente.nome}</strong> — Dentista:{' '}
              <strong>{visita.dentista.nome}</strong>
            </p>
          </div>
        ) : (
          <>
            <div className="col-12">
              <PacienteBusca
                incluirDesativados={antigo}
                onSelecionar={setPaciente}
                onSessaoExpirada={onSessaoExpirada}
              />
            </div>

            <div className="col-12 col-md-5">
              <label htmlFor="dentista" className="form-label">
                Dentista
              </label>
              <select
                id="dentista"
                className="form-select"
                value={dentistaId}
                onChange={(e) => setDentistaId(e.target.value)}
              >
                <option value="">Selecione</option>
                {dentistas
                  .filter((dentista) => antigo || dentista.ativo)
                  .map((dentista) => (
                    <option key={dentista.id} value={dentista.id}>
                      {dentista.nome}
                      {dentista.ativo ? '' : ' (desativado)'}
                    </option>
                  ))}
              </select>
            </div>
          </>
        )}

        <div className="col-12 col-md-3">
          <label htmlFor="data" className="form-label">
            Data da visita
          </label>
          <input
            id="data"
            className="form-control"
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
        </div>

        <div className="col-12 col-md-5">
          <label htmlFor="catalogo" className="form-label">
            Procedimento do catálogo
          </label>
          <select
            id="catalogo"
            className="form-select"
            value={catalogoId}
            onChange={(e) => escolherCatalogo(e.target.value)}
          >
            <option value="">Sem vínculo com o catálogo</option>
            {vinculoFora && visita?.procedimentoCatalogo && (
              <option value={visita.procedimentoCatalogo.id}>
                {visita.procedimentoCatalogo.nome} (desativado)
              </option>
            )}
            {(catalogo ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="col-12 col-md-7">
          <label htmlFor="procedimento" className="form-label">
            Procedimento realizado
          </label>
          <input
            id="procedimento"
            className="form-control"
            value={procedimento}
            onChange={(e) => setProcedimento(e.target.value)}
          />
        </div>

        <div className="col-12">
          <label htmlFor="observacoes" className="form-label">
            Observações
          </label>
          <textarea
            id="observacoes"
            className="form-control"
            rows={3}
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
          />
        </div>

        {!edicao && (
          <div className="col-12">
            <div className="form-check">
              <input
                id="antigo"
                className="form-check-input"
                type="checkbox"
                checked={antigo}
                onChange={(e) => setAntigo(e.target.checked)}
              />
              <label htmlFor="antigo" className="form-check-label">
                Registro antigo (permite paciente ou dentista desativado)
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 d-flex gap-2">
        <button type="submit" className="btn btn-primary" disabled={enviando}>
          {enviando ? 'Salvando...' : edicao ? 'Salvar' : 'Registrar'}
        </button>
        <Link
          to={edicao ? `/visitas/${visita.id}` : '/visitas'}
          className="btn btn-outline-secondary"
        >
          Voltar
        </Link>
      </div>
    </form>
  )
}
