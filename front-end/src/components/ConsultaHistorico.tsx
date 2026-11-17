import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ErroApi, chamarApi, mensagemDoErro } from '../services/api'
import { formatarDataHora } from '../utils/datas'
import { MOTIVOS } from '../types/Motivo'
import { SITUACOES } from '../types/Consulta'
import type { Consulta } from '../types/Consulta'
import type { HistoricoConsulta } from '../types/HistoricoConsulta'

type ConsultaHistoricoProps = {
  onSessaoExpirada: () => void
}

type Resposta = {
  id: string
  tentativa: number
  consulta: Consulta | null
  registros: HistoricoConsulta[]
  erro: string
}

const TIPOS = {
  CRIACAO: 'Criação',
  MUDANCA_DE_STATUS: 'Mudança de situação',
  REAGENDAMENTO: 'Reagendamento',
}

function descrever(registro: HistoricoConsulta): string {
  if (registro.tipo === 'MUDANCA_DE_STATUS') {
    const de =
      registro.status_anterior !== null
        ? SITUACOES[registro.status_anterior].rotulo
        : '—'
    const para =
      registro.status_novo !== null ? SITUACOES[registro.status_novo].rotulo : '—'

    return `${de} → ${para}`
  }

  if (registro.tipo === 'REAGENDAMENTO') {
    const de =
      registro.inicio_anterior !== null
        ? formatarDataHora(registro.inicio_anterior)
        : '—'
    const para =
      registro.inicio_novo !== null ? formatarDataHora(registro.inicio_novo) : '—'

    return `${de} → ${para}`
  }

  return registro.status_novo !== null
    ? SITUACOES[registro.status_novo].rotulo
    : '—'
}

function motivo(registro: HistoricoConsulta): string {
  const codigo =
    MOTIVOS.find((item) => item.codigo === registro.motivo_codigo)?.rotulo ?? null
  const partes = [registro.motivo_exibicao ?? codigo, registro.motivo]

  return partes.filter(Boolean).join(': ') || '—'
}

export function ConsultaHistorico({ onSessaoExpirada }: ConsultaHistoricoProps) {
  const { id = '' } = useParams()
  const [tentativa, setTentativa] = useState(0)
  const [resposta, setResposta] = useState<Resposta | null>(null)

  const carregando =
    resposta === null || resposta.id !== id || resposta.tentativa !== tentativa

  useEffect(() => {
    let ativo = true

    Promise.all([
      chamarApi<Consulta>(`/consultas/${id}`),
      chamarApi<HistoricoConsulta[]>(`/consultas/${id}/historico`),
    ])
      .then(([consulta, registros]) => {
        if (ativo) {
          setResposta({ id, tentativa, consulta, registros, erro: '' })
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
          id,
          tentativa,
          consulta: null,
          registros: [],
          erro: mensagemDoErro(e, 'Não foi possível carregar o histórico.'),
        })
      })

    return () => {
      ativo = false
    }
  }, [id, tentativa, onSessaoExpirada])

  const consulta = carregando ? null : resposta.consulta
  const registros = carregando ? [] : resposta.registros
  const erro = carregando ? '' : resposta.erro

  return (
    <>
      <h2 className="h5 mb-3">Histórico da consulta</h2>

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

      {consulta !== null && (
        <p>
          {consulta.paciente.nome} com {consulta.dentista.nome}, em{' '}
          {formatarDataHora(consulta.inicio_em)} (
          {SITUACOES[consulta.status].rotulo}).
        </p>
      )}

      {consulta !== null && registros.length === 0 && (
        <p className="text-secondary">Nenhum registro.</p>
      )}

      {registros.length > 0 && (
        <table className="table table-striped table-sm align-middle">
          <thead>
            <tr>
              <th>Data e hora</th>
              <th>Evento</th>
              <th>Mudança</th>
              <th>Motivo</th>
              <th>Usuário</th>
            </tr>
          </thead>
          <tbody>
            {registros.map((registro) => (
              <tr key={registro.id}>
                <td>{formatarDataHora(registro.registrado_em)}</td>
                <td>{TIPOS[registro.tipo]}</td>
                <td>{descrever(registro)}</td>
                <td>{motivo(registro)}</td>
                <td>{registro.usuario.nome}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Link to="/agenda" className="btn btn-outline-secondary">
        Voltar à agenda
      </Link>
    </>
  )
}
