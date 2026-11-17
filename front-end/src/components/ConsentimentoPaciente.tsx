import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ErroApi, chamarApi, mensagemDoErro } from '../services/api'
import { formatarDataHora } from '../utils/datas'
import type { Consentimento } from '../types/Consentimento'
import type { PacienteComConsentimento } from '../types/Paciente'

type ConsentimentoPacienteProps = {
  pacienteId: number
  inicial: PacienteComConsentimento['consentimento']
  onSessaoExpirada: () => void
}

type Resposta = {
  tentativa: number
  historico: Consentimento[]
  erro: string
}

const SITUACAO = {
  SEM_REGISTRO: 'Sem registro',
  CONCEDIDO: 'Concedido',
  REVOGADO: 'Revogado',
}

const ACAO = {
  CONCESSAO: 'Concessão',
  REVOGACAO: 'Revogação',
}

export function ConsentimentoPaciente({
  pacienteId,
  inicial,
  onSessaoExpirada,
}: ConsentimentoPacienteProps) {
  const [resumo, setResumo] = useState(inicial)
  const [tentativa, setTentativa] = useState(0)
  const [resposta, setResposta] = useState<Resposta | null>(null)
  const [termo, setTermo] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [enviando, setEnviando] = useState(false)

  const carregando = resposta === null || resposta.tentativa !== tentativa

  useEffect(() => {
    let ativo = true

    chamarApi<Consentimento[]>(`/consentimentos?paciente_id=${pacienteId}`)
      .then((historico) => {
        if (ativo) {
          setResposta({ tentativa, historico, erro: '' })
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
          historico: [],
          erro: mensagemDoErro(
            e,
            'Não foi possível carregar o histórico de consentimento.',
          ),
        })
      })

    return () => {
      ativo = false
    }
  }, [pacienteId, tentativa, onSessaoExpirada])

  const historico = carregando ? [] : resposta.historico
  const erroHistorico = carregando ? '' : resposta.erro

  const concedido = resumo.situacao === 'CONCEDIDO'

  async function registrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErro('')
    setSucesso('')
    setEnviando(true)

    const acao = concedido ? 'REVOGACAO' : 'CONCESSAO'

    try {
      const registro = await chamarApi<Consentimento>('/consentimentos', {
        method: 'POST',
        body: JSON.stringify({ paciente_id: pacienteId, acao, termo }),
      })

      setResumo({
        situacao: acao === 'CONCESSAO' ? 'CONCEDIDO' : 'REVOGADO',
        termo: registro.termo,
        registrado_em: registro.registrado_em,
        registrado_por: registro.registrado_por,
      })
      setTermo('')
      setSucesso(
        acao === 'CONCESSAO'
          ? 'Concessão de consentimento registrada.'
          : 'Revogação de consentimento registrada.',
      )
      setTentativa(tentativa + 1)
    }
    catch (e) {
      if (e instanceof ErroApi && e.status === 401) {
        onSessaoExpirada()
        return
      }

      setErro(mensagemDoErro(e, 'Não foi possível registrar o consentimento.'))
    }
    finally {
      setEnviando(false)
    }
  }

  return (
    <section className="mt-4">
      <h3 className="h6">Consentimento</h3>

      <p>
        Situação atual: <strong>{SITUACAO[resumo.situacao]}</strong>
        {resumo.registrado_em !== null &&
          ` em ${formatarDataHora(resumo.registrado_em)}`}
        {resumo.registrado_por !== null && ` por ${resumo.registrado_por.nome}`}
        {resumo.termo !== null && ` (termo: ${resumo.termo})`}
      </p>

      <form onSubmit={registrar} noValidate>
        {erro && (
          <div className="alert alert-danger" role="alert">
            {erro}
          </div>
        )}

        {sucesso && (
          <div className="alert alert-success" role="status">
            {sucesso}
          </div>
        )}

        <div className="row g-2 align-items-end">
          <div className="col-12 col-md-6">
            <label htmlFor="termo" className="form-label">
              Identificação do termo (até 60 caracteres)
            </label>
            <input
              id="termo"
              className="form-control"
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
            />
          </div>

          <div className="col-12 col-md-4">
            <button
              type="submit"
              className={
                concedido ? 'btn btn-outline-danger' : 'btn btn-outline-primary'
              }
              disabled={enviando}
            >
              {enviando
                ? 'Registrando...'
                : concedido
                  ? 'Registrar revogação'
                  : 'Registrar concessão'}
            </button>
          </div>
        </div>
      </form>

      <h4 className="h6 mt-3">Histórico</h4>

      {carregando && <p className="text-secondary">Carregando...</p>}

      {erroHistorico && (
        <div
          className="alert alert-danger d-flex justify-content-between align-items-center"
          role="alert"
        >
          <span>{erroHistorico}</span>
          <button
            type="button"
            className="btn btn-outline-danger btn-sm"
            onClick={() => setTentativa(tentativa + 1)}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!carregando && !erroHistorico && historico.length === 0 && (
        <p className="text-secondary">Nenhum registro de consentimento.</p>
      )}

      {!carregando && !erroHistorico && historico.length > 0 && (
        <table className="table table-striped table-sm align-middle">
          <thead>
            <tr>
              <th>Data e hora</th>
              <th>Ação</th>
              <th>Termo</th>
              <th>Registrado por</th>
            </tr>
          </thead>
          <tbody>
            {historico.map((registro) => (
              <tr key={registro.id}>
                <td>{formatarDataHora(registro.registrado_em)}</td>
                <td>{ACAO[registro.acao]}</td>
                <td>{registro.termo}</td>
                <td>{registro.registrado_por.nome}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
