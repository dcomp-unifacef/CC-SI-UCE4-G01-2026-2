import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { ErroApi, chamarApi, mensagemDoErro } from '../services/api'
import { diaDoInstante, formatarDiaCivil } from '../utils/datas'
import type { Consulta, ConsultaRealizada } from '../types/Consulta'
import type { Procedimento } from '../types/Procedimento'

type RealizarConsultaProps = {
  consulta: Consulta
  onSessaoExpirada: () => void
}

export function RealizarConsulta({
  consulta,
  onSessaoExpirada,
}: RealizarConsultaProps) {
  const dia = diaDoInstante(consulta.inicio_em)

  const [catalogo, setCatalogo] = useState<Procedimento[]>([])
  const [itemId, setItemId] = useState('')
  const [procedimento, setProcedimento] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [retornoMeses, setRetornoMeses] = useState('6')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<ConsultaRealizada | null>(null)

  useEffect(() => {
    chamarApi<Procedimento[]>('/procedimentos?ativo=true')
      .then(setCatalogo)
      .catch((e) => {
        if (e instanceof ErroApi && e.status === 401) {
          onSessaoExpirada()
          return
        }

        setErro(
          mensagemDoErro(
            e,
            'Não foi possível carregar o catálogo de procedimentos.',
          ),
        )
      })
  }, [onSessaoExpirada])

  function escolherItem(valor: string) {
    setItemId(valor)

    const item = catalogo.find((entrada) => String(entrada.id) === valor)

    if (item) {
      setProcedimento(item.nome)
    }
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErro('')

    if (procedimento.trim() === '') {
      setErro('Informe o procedimento realizado.')
      return
    }

    const corpo: Record<string, string | number> = {
      status: 'REALIZADA',
      procedimento: procedimento.trim(),
      retorno_meses: Number(retornoMeses),
    }

    if (itemId !== '') {
      corpo.procedimento_id = Number(itemId)
    }

    if (observacoes.trim() !== '') {
      corpo.observacoes = observacoes.trim()
    }

    setEnviando(true)

    try {
      const realizada = await chamarApi<ConsultaRealizada>(
        `/consultas/${consulta.id}/status`,
        { method: 'PATCH', body: JSON.stringify(corpo) },
      )

      setResultado(realizada)
    }
    catch (e) {
      if (e instanceof ErroApi && e.status === 401) {
        onSessaoExpirada()
        return
      }

      setErro(mensagemDoErro(e, 'Não foi possível registrar o atendimento.'))
    }
    finally {
      setEnviando(false)
    }
  }

  if (resultado) {
    return (
      <>
        <div className="alert alert-success" role="alert">
          Atendimento registrado. Visita de{' '}
          {formatarDiaCivil(resultado.visita.data_visita)}; retorno previsto
          para {formatarDiaCivil(resultado.retorno.data_prevista)}.
        </div>
        <Link to={`/agenda?dia=${dia}`} className="btn btn-primary">
          Voltar à agenda
        </Link>
      </>
    )
  }

  return (
    <form onSubmit={enviar}>
      {erro && (
        <div className="alert alert-danger" role="alert">
          {erro}
        </div>
      )}

      <div className="row g-3">
        <div className="col-12 col-md-6">
          <label htmlFor="item" className="form-label">
            Item do catálogo (opcional)
          </label>
          <select
            id="item"
            className="form-select"
            value={itemId}
            onChange={(e) => escolherItem(e.target.value)}
          >
            <option value="">Sem item do catálogo</option>
            {catalogo.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="col-12 col-md-6">
          <label htmlFor="procedimento" className="form-label">
            Procedimento realizado
          </label>
          <input
            id="procedimento"
            className="form-control"
            type="text"
            value={procedimento}
            onChange={(e) => setProcedimento(e.target.value)}
            required
          />
        </div>

        <div className="col-12">
          <label htmlFor="observacoes" className="form-label">
            Observações (opcional)
          </label>
          <textarea
            id="observacoes"
            className="form-control"
            rows={3}
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
          />
        </div>

        <div className="col-12 col-md-3">
          <label htmlFor="retorno" className="form-label">
            Retorno em
          </label>
          <select
            id="retorno"
            className="form-select"
            value={retornoMeses}
            onChange={(e) => setRetornoMeses(e.target.value)}
          >
            <option value="3">3 meses</option>
            <option value="6">6 meses</option>
            <option value="12">12 meses</option>
          </select>
        </div>
      </div>

      <div className="mt-3 d-flex gap-2">
        <button type="submit" className="btn btn-primary" disabled={enviando}>
          {enviando ? 'Registrando...' : 'Registrar atendimento'}
        </button>
        <Link to={`/agenda?dia=${dia}`} className="btn btn-outline-secondary">
          Voltar
        </Link>
      </div>
    </form>
  )
}
