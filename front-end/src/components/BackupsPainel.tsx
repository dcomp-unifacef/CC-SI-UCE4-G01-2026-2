import { useEffect, useState } from 'react'
import { ErroApi, chamarApi, mensagemDoErro } from '../services/api'
import { formatarDataHora, formatarDiaCivil } from '../utils/datas'
import { formatarTamanho } from '../utils/formatos'
import type { AvisoBackup, Backup } from '../types/Backup'

type BackupsPainelProps = {
  onSessaoExpirada: () => void
}

type Resposta = {
  tentativa: number
  backups: Backup[]
  aviso: AvisoBackup | null
  erro: string
}

const SITUACAO = {
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDO: 'Concluído',
  FALHOU: 'Falhou',
}

const ORIGEM = {
  AGENDADO: 'Agendado',
  MANUAL: 'Manual',
}

export function BackupsPainel({ onSessaoExpirada }: BackupsPainelProps) {
  const [tentativa, setTentativa] = useState(0)
  const [resposta, setResposta] = useState<Resposta | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [executando, setExecutando] = useState(false)
  const [marcando, setMarcando] = useState<number | null>(null)
  const [erroAcao, setErroAcao] = useState('')
  const [mensagem, setMensagem] = useState('')

  const carregando = resposta === null || resposta.tentativa !== tentativa

  useEffect(() => {
    let ativo = true

    Promise.all([
      chamarApi<Backup[]>('/backups?limite=30'),
      chamarApi<AvisoBackup>('/backups/aviso'),
    ])
      .then(([backups, aviso]) => {
        if (ativo) {
          setResposta({ tentativa, backups, aviso, erro: '' })
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
          backups: [],
          aviso: null,
          erro: mensagemDoErro(
            e,
            'Não foi possível carregar os backups. Tente novamente.',
          ),
        })
      })

    return () => {
      ativo = false
    }
  }, [tentativa, onSessaoExpirada])

  const backups = carregando ? [] : resposta.backups
  const aviso = carregando ? null : resposta.aviso
  const erro = carregando ? '' : resposta.erro

  async function executar() {
    setErroAcao('')
    setMensagem('')
    setExecutando(true)

    try {
      const execucao = await chamarApi<Backup>('/backups', { method: 'POST' })

      setConfirmando(false)
      setMensagem(
        `Backup manual iniciado (execução n.º ${execucao.id}). Ele roda em segundo plano: use Atualizar para ver o resultado.`,
      )
      setTentativa(tentativa + 1)
    }
    catch (e) {
      if (e instanceof ErroApi && e.status === 401) {
        onSessaoExpirada()
        return
      }

      setConfirmando(false)
      setErroAcao(mensagemDoErro(e, 'Não foi possível iniciar o backup.'))
    }
    finally {
      setExecutando(false)
    }
  }

  async function marcarVisto(id: number) {
    setErroAcao('')
    setMensagem('')
    setMarcando(id)

    try {
      await chamarApi<Backup>(`/backups/${id}/visto`, { method: 'POST' })

      setMensagem(`Aviso da execução n.º ${id} marcado como visto.`)
      setTentativa(tentativa + 1)
    }
    catch (e) {
      if (e instanceof ErroApi && e.status === 401) {
        onSessaoExpirada()
        return
      }

      setErroAcao(mensagemDoErro(e, 'Não foi possível marcar o aviso como visto.'))
    }
    finally {
      setMarcando(null)
    }
  }

  const semAvisos =
    aviso !== null &&
    aviso.configurada &&
    aviso.falhas.length === 0 &&
    aviso.arquivos_ausentes.length === 0 &&
    aviso.arquivos_sem_registro.length === 0

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="h5 mb-0">Backup</h2>

        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            disabled={carregando}
            onClick={() => setTentativa(tentativa + 1)}
          >
            Atualizar
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={confirmando || executando}
            onClick={() => {
              setErroAcao('')
              setMensagem('')
              setConfirmando(true)
            }}
          >
            Executar backup agora
          </button>
        </div>
      </div>

      {confirmando && (
        <div className="alert alert-warning" role="alert">
          <p className="mb-2">
            O servidor vai gerar uma cópia do banco de dados agora. Confirma a
            execução do backup manual?
          </p>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={executando}
              onClick={executar}
            >
              {executando ? 'Iniciando...' : 'Confirmar execução'}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              disabled={executando}
              onClick={() => setConfirmando(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {erroAcao && (
        <div className="alert alert-danger" role="alert">
          {erroAcao}
        </div>
      )}

      {mensagem && (
        <div className="alert alert-success" role="status">
          {mensagem}
        </div>
      )}

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

      {aviso !== null && (
        <section className="mb-4">
          <h3 className="h6">Avisos</h3>

          {!aviso.configurada && (
            <div className="alert alert-warning" role="alert">
              O backup não está configurado no servidor e nenhuma cópia será feita
              até que isso seja corrigido.
              {aviso.motivo && ` Motivo: ${aviso.motivo}`}
            </div>
          )}

          {aviso.falhas.map((falha) => (
            <div
              key={falha.id}
              className="alert alert-danger d-flex justify-content-between align-items-center"
              role="alert"
            >
              <span>
                Execução n.º {falha.id} ({formatarDataHora(falha.iniciado_em)})
                falhou
                {falha.erro ? `: ${falha.erro}` : '.'}
              </span>
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                disabled={marcando === falha.id}
                onClick={() => marcarVisto(falha.id)}
              >
                {marcando === falha.id ? 'Aguarde...' : 'Marcar como visto'}
              </button>
            </div>
          ))}

          {aviso.arquivos_ausentes.length > 0 && (
            <div className="alert alert-warning" role="alert">
              Arquivos registrados que não estão na pasta de backup:{' '}
              {aviso.arquivos_ausentes.join(', ')}
            </div>
          )}

          {aviso.arquivos_sem_registro.length > 0 && (
            <div className="alert alert-warning" role="alert">
              Arquivos na pasta de backup sem registro no sistema:{' '}
              {aviso.arquivos_sem_registro.join(', ')}
            </div>
          )}

          {semAvisos && <p className="text-secondary mb-0">Nenhum aviso.</p>}
        </section>
      )}

      {!carregando && !erro && backups.length === 0 && (
        <p className="text-secondary">Nenhuma execução registrada.</p>
      )}

      {!carregando && !erro && backups.length > 0 && (
        <>
          <h3 className="h6">Execuções recentes</h3>

          <div className="table-responsive">
            <table className="table table-striped table-sm align-middle">
              <thead>
                <tr>
                  <th>N.º</th>
                  <th>Origem</th>
                  <th>Situação</th>
                  <th>Referência</th>
                  <th>Início</th>
                  <th>Fim</th>
                  <th>Arquivo</th>
                  <th>Tamanho</th>
                  <th>Solicitado por</th>
                  <th>Aviso</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((backup) => (
                  <tr key={backup.id}>
                    <td>{backup.id}</td>
                    <td>{ORIGEM[backup.origem]}</td>
                    <td>{SITUACAO[backup.situacao]}</td>
                    <td>
                      {backup.data_referencia !== null
                        ? formatarDiaCivil(backup.data_referencia)
                        : '—'}
                    </td>
                    <td>{formatarDataHora(backup.iniciado_em)}</td>
                    <td>
                      {backup.finalizado_em !== null
                        ? formatarDataHora(backup.finalizado_em)
                        : '—'}
                    </td>
                    <td>
                      {backup.arquivo ?? '—'}
                      {backup.arquivo_removido_em !== null && ' (removido)'}
                    </td>
                    <td>
                      {backup.tamanho_bytes !== null
                        ? formatarTamanho(backup.tamanho_bytes)
                        : '—'}
                    </td>
                    <td>{backup.solicitado_por?.nome ?? '—'}</td>
                    <td>
                      {backup.situacao !== 'FALHOU'
                        ? '—'
                        : backup.aviso_visto_em !== null
                          ? `Visto em ${formatarDataHora(backup.aviso_visto_em)}`
                          : 'Pendente'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="text-secondary mt-3 mb-0">
        A restauração de backup não está disponível nesta tela.
      </p>
    </>
  )
}
