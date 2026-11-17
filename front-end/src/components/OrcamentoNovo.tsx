import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { ErroApi, chamarApi, mensagemDoErro } from '../services/api'
import { PacienteBusca } from './PacienteBusca'
import type { Dentista } from '../types/Dentista'
import type { Orcamento } from '../types/Orcamento'
import type { Paciente } from '../types/Paciente'

type OrcamentoNovoProps = {
  onSessaoExpirada: () => void
}

export function OrcamentoNovo({ onSessaoExpirada }: OrcamentoNovoProps) {
  const navigate = useNavigate()

  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [dentistas, setDentistas] = useState<Dentista[]>([])
  const [dentistaId, setDentistaId] = useState('')
  const [validoAte, setValidoAte] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    let ativo = true

    chamarApi<Dentista[]>('/dentistas')
      .then((lista) => {
        if (ativo) {
          setDentistas(lista.filter((dentista) => dentista.ativo))
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

    return () => {
      ativo = false
    }
  }, [onSessaoExpirada])

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErro('')

    if (paciente === null) {
      setErro('Busque e selecione o paciente.')
      return
    }

    setEnviando(true)

    try {
      const criado = await chamarApi<Orcamento>('/orcamentos', {
        method: 'POST',
        body: JSON.stringify({
          paciente_id: paciente.id,
          dentista_id: dentistaId === '' ? null : Number(dentistaId),
          valido_ate: validoAte === '' ? null : validoAte,
          itens: [],
        }),
      })

      navigate(`/orcamentos/${criado.id}`)
    }
    catch (e) {
      if (e instanceof ErroApi && e.status === 401) {
        onSessaoExpirada()
        return
      }

      setErro(mensagemDoErro(e, 'Não foi possível criar o orçamento.'))
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
        <div className="col-12">
          <PacienteBusca
            onSelecionar={setPaciente}
            onSessaoExpirada={onSessaoExpirada}
          />
        </div>

        <div className="col-12 col-md-5">
          <label htmlFor="dentista" className="form-label">
            Dentista responsável (opcional)
          </label>
          <select
            id="dentista"
            className="form-select"
            value={dentistaId}
            onChange={(e) => setDentistaId(e.target.value)}
          >
            <option value="">Sem dentista</option>
            {dentistas.map((dentista) => (
              <option key={dentista.id} value={dentista.id}>
                {dentista.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="col-12 col-md-3">
          <label htmlFor="valido" className="form-label">
            Válido até (opcional)
          </label>
          <input
            id="valido"
            className="form-control"
            type="date"
            value={validoAte}
            onChange={(e) => setValidoAte(e.target.value)}
          />
        </div>
      </div>

      <p className="text-secondary mt-3 mb-0">
        Os itens são adicionados na ficha do orçamento, depois de criado.
      </p>

      <div className="mt-3 d-flex gap-2">
        <button type="submit" className="btn btn-primary" disabled={enviando}>
          {enviando ? 'Criando...' : 'Criar orçamento'}
        </button>
        <Link to="/orcamentos" className="btn btn-outline-secondary">
          Voltar
        </Link>
      </div>
    </form>
  )
}
