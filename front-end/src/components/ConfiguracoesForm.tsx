import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ErroApi, chamarApi, mensagemDoErro } from '../services/api'
import { formatarDataHora } from '../utils/datas'
import type { Configuracao } from '../types/Configuracao'

type ConfiguracoesFormProps = {
  onSessaoExpirada: () => void
}

type Resposta = {
  tentativa: number
  configuracao: Configuracao | null
  erro: string
}

type Campos = {
  sessao_inatividade_min: string
  sessao_duracao_max_min: string
  consulta_duracao_max_min: string
  backup_horario: string
}

const LIMITES = [
  { campo: 'sessao_inatividade_min', rotulo: 'Inatividade da sessão (minutos)' },
  { campo: 'sessao_duracao_max_min', rotulo: 'Duração máxima da sessão (minutos)' },
  { campo: 'consulta_duracao_max_min', rotulo: 'Duração máxima da consulta (minutos)' },
] as const

function paraCampos(configuracao: Configuracao): Campos {
  return {
    sessao_inatividade_min: String(configuracao.sessao_inatividade_min),
    sessao_duracao_max_min: String(configuracao.sessao_duracao_max_min),
    consulta_duracao_max_min: String(configuracao.consulta_duracao_max_min),
    backup_horario: configuracao.backup_horario,
  }
}

export function ConfiguracoesForm({ onSessaoExpirada }: ConfiguracoesFormProps) {
  const [tentativa, setTentativa] = useState(0)
  const [resposta, setResposta] = useState<Resposta | null>(null)
  const [campos, setCampos] = useState<Campos | null>(null)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [enviando, setEnviando] = useState(false)

  const carregando = resposta === null || resposta.tentativa !== tentativa

  useEffect(() => {
    let ativo = true

    chamarApi<Configuracao>('/configuracoes')
      .then((configuracao) => {
        if (ativo) {
          setResposta({ tentativa, configuracao, erro: '' })
          setCampos(paraCampos(configuracao))
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
          configuracao: null,
          erro: mensagemDoErro(
            e,
            'Não foi possível carregar as configurações. Tente novamente.',
          ),
        })
      })

    return () => {
      ativo = false
    }
  }, [tentativa, onSessaoExpirada])

  const configuracao = carregando ? null : resposta.configuracao
  const erroCarga = carregando ? '' : resposta.erro

  function alterar(campo: keyof Campos, valor: string) {
    setSucesso('')
    setCampos((atual) => (atual === null ? atual : { ...atual, [campo]: valor }))
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErro('')
    setSucesso('')

    if (configuracao === null || campos === null) {
      return
    }

    const original = paraCampos(configuracao)
    const corpo: Record<string, string | number> = {}

    for (const { campo } of LIMITES) {
      const texto = campos[campo].trim()

      if (texto !== original[campo]) {
        corpo[campo] = /^\d+$/.test(texto) ? Number(texto) : texto
      }
    }

    if (campos.backup_horario !== original.backup_horario) {
      corpo.backup_horario = campos.backup_horario
    }

    if (Object.keys(corpo).length === 0) {
      setErro('Nenhuma alteração para salvar.')
      return
    }

    setEnviando(true)

    try {
      const salva = await chamarApi<Configuracao>('/configuracoes', {
        method: 'PATCH',
        body: JSON.stringify(corpo),
      })

      setResposta({ tentativa, configuracao: salva, erro: '' })
      setCampos(paraCampos(salva))
      setSucesso('Configurações salvas.')
    }
    catch (e) {
      if (e instanceof ErroApi && e.status === 401) {
        onSessaoExpirada()
        return
      }

      setErro(mensagemDoErro(e, 'Não foi possível salvar as configurações.'))
    }
    finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <h2 className="h5 mb-3">Configurações</h2>

      {carregando && <p className="text-secondary">Carregando...</p>}

      {erroCarga && (
        <div
          className="alert alert-danger d-flex justify-content-between align-items-center"
          role="alert"
        >
          <span>{erroCarga}</span>
          <button
            type="button"
            className="btn btn-outline-danger btn-sm"
            onClick={() => setTentativa(tentativa + 1)}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {configuracao !== null && campos !== null && (
        <form onSubmit={enviar} noValidate>
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

          <div className="row g-3">
            {LIMITES.map(({ campo, rotulo }) => (
              <div key={campo} className="col-12 col-md-4">
                <label htmlFor={campo} className="form-label">
                  {rotulo}
                </label>
                <input
                  id={campo}
                  className="form-control"
                  inputMode="numeric"
                  value={campos[campo]}
                  onChange={(e) => alterar(campo, e.target.value)}
                />
              </div>
            ))}

            <div className="col-12 col-md-4">
              <label htmlFor="backup_horario" className="form-label">
                Horário do backup agendado
              </label>
              <input
                id="backup_horario"
                type="time"
                className="form-control"
                value={campos.backup_horario}
                onChange={(e) => alterar('backup_horario', e.target.value)}
              />
            </div>
          </div>

          <p className="text-secondary mt-3 mb-0">
            Última alteração em {formatarDataHora(configuracao.atualizado_em)}
            {configuracao.atualizado_por_id !== null &&
              ` (usuário n.º ${configuracao.atualizado_por_id})`}
            .
          </p>

          <div className="mt-3">
            <button type="submit" className="btn btn-primary" disabled={enviando}>
              {enviando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      )}
    </>
  )
}
