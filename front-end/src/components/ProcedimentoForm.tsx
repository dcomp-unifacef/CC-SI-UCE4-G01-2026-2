import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { ErroApi, chamarApi, mensagemDoErro } from '../services/api'
import { lerReais } from '../utils/formatos'
import type { Procedimento } from '../types/Procedimento'

type ProcedimentoFormProps = {
  procedimento?: Procedimento
  onSessaoExpirada: () => void
}

export function ProcedimentoForm({
  procedimento,
  onSessaoExpirada,
}: ProcedimentoFormProps) {
  const navigate = useNavigate()
  const edicao = procedimento !== undefined

  const [nome, setNome] = useState(procedimento?.nome ?? '')
  const [valor, setValor] = useState(
    procedimento !== undefined
      ? (procedimento.valor_centavos / 100).toFixed(2).replace('.', ',')
      : '',
  )
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErro('')

    const centavos = lerReais(valor)

    if (centavos === null) {
      setErro('Informe o valor em reais, por exemplo 150,00.')
      return
    }

    setEnviando(true)

    try {
      await chamarApi<Procedimento>(
        edicao ? `/procedimentos/${procedimento.id}` : '/procedimentos',
        {
          method: edicao ? 'PATCH' : 'POST',
          body: JSON.stringify({ nome, valor_centavos: centavos }),
        },
      )

      navigate('/procedimentos')
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
            ? 'Não foi possível salvar o procedimento.'
            : 'Não foi possível cadastrar o procedimento.',
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

        <div className="col-12 col-md-3">
          <label htmlFor="valor" className="form-label">
            Valor (R$)
          </label>
          <input
            id="valor"
            className="form-control"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-3 d-flex gap-2">
        <button type="submit" className="btn btn-primary" disabled={enviando}>
          {enviando ? 'Salvando...' : edicao ? 'Salvar' : 'Cadastrar'}
        </button>
        <Link to="/procedimentos" className="btn btn-outline-secondary">
          Voltar
        </Link>
      </div>
    </form>
  )
}
