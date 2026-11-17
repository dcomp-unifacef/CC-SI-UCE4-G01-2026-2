import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ErroApi, chamarApi, mensagemDoErro } from '../services/api'
import { diaDoInstante, formatarDataHora, formatarDiaCivil } from '../utils/datas'
import { formatarReais } from '../utils/formatos'
import { SITUACOES_ORCAMENTO, TIPOS_HISTORICO_ORCAMENTO } from '../types/Orcamento'
import type { HistoricoOrcamento, Orcamento } from '../types/Orcamento'
import type { Dentista } from '../types/Dentista'
import type { Procedimento } from '../types/Procedimento'
import type { Usuario } from '../types/Usuario'

type OrcamentoFichaProps = {
  usuario: Usuario
  orcamento: Orcamento
  onRecarregar: () => void
  onSessaoExpirada: () => void
}

const apiBase = import.meta.env.VITE_API_BASE

export function OrcamentoFicha({
  usuario,
  orcamento,
  onRecarregar,
  onSessaoExpirada,
}: OrcamentoFichaProps) {
  const clinico = usuario.perfil !== 'SECRETARIA'
  const pendente = orcamento.situacao === 'PENDENTE'
  const decidido = !pendente
  const outraSituacao =
    orcamento.situacao === 'APROVADO' ? 'RECUSADO' : 'APROVADO'

  const [catalogo, setCatalogo] = useState<Procedimento[]>([])
  const [dentistas, setDentistas] = useState<Dentista[]>([])
  const [dentistaId, setDentistaId] = useState(
    orcamento.dentista === null ? '' : String(orcamento.dentista.id),
  )
  const [validoAte, setValidoAte] = useState(orcamento.valido_ate ?? '')
  const [quantidades, setQuantidades] = useState<Record<number, string>>({})
  const [novoProcedimento, setNovoProcedimento] = useState('')
  const [novaQuantidade, setNovaQuantidade] = useState('1')
  const [motivo, setMotivo] = useState('')
  const [historico, setHistorico] = useState<HistoricoOrcamento[] | null>(null)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (!clinico || !pendente) {
      return
    }

    let ativo = true

    Promise.all([
      chamarApi<Procedimento[]>('/procedimentos?ativo=true'),
      chamarApi<Dentista[]>('/dentistas'),
    ])
      .then(([itens, lista]) => {
        if (ativo) {
          setCatalogo(itens)
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

        setErro(mensagemDoErro(e, 'Não foi possível carregar o catálogo.'))
      })

    return () => {
      ativo = false
    }
  }, [clinico, pendente, onSessaoExpirada])

  async function executar(
    caminho: string,
    metodo: string,
    corpo: Record<string, unknown> | null,
    padrao: string,
  ) {
    setErro('')
    setEnviando(true)

    try {
      await chamarApi<Orcamento>(caminho, {
        method: metodo,
        ...(corpo === null ? {} : { body: JSON.stringify(corpo) }),
      })

      onRecarregar()
    }
    catch (e) {
      if (e instanceof ErroApi && e.status === 401) {
        onSessaoExpirada()
        return
      }

      setErro(mensagemDoErro(e, padrao))
    }
    finally {
      setEnviando(false)
    }
  }

  function salvarCabecalho() {
    executar(
      `/orcamentos/${orcamento.id}`,
      'PATCH',
      {
        dentista_id: dentistaId === '' ? null : Number(dentistaId),
        valido_ate: validoAte === '' ? null : validoAte,
      },
      'Não foi possível salvar o orçamento.',
    )
  }

  function adicionarItem() {
    executar(
      `/orcamentos/${orcamento.id}/itens`,
      'POST',
      {
        procedimento_id: novoProcedimento === '' ? null : Number(novoProcedimento),
        quantidade: Number(novaQuantidade),
      },
      'Não foi possível adicionar o item.',
    )
  }

  function salvarQuantidade(itemId: number) {
    executar(
      `/orcamentos/${orcamento.id}/itens/${itemId}`,
      'PATCH',
      { quantidade: Number(quantidades[itemId]) },
      'Não foi possível alterar o item.',
    )
  }

  function removerItem(itemId: number) {
    executar(
      `/orcamentos/${orcamento.id}/itens/${itemId}`,
      'DELETE',
      null,
      'Não foi possível remover o item.',
    )
  }

  function decidir(situacao: 'APROVADO' | 'RECUSADO') {
    executar(
      `/orcamentos/${orcamento.id}/decisao`,
      'POST',
      motivo.trim() === '' ? { situacao } : { situacao, motivo },
      'Não foi possível registrar a decisão.',
    )
  }

  function corrigir() {
    executar(
      `/orcamentos/${orcamento.id}/correcao`,
      'POST',
      { situacao: outraSituacao, motivo },
      'Não foi possível corrigir a decisão.',
    )
  }

  function reabrir() {
    executar(
      `/orcamentos/${orcamento.id}/reabertura`,
      'POST',
      { motivo },
      'Não foi possível reabrir o orçamento.',
    )
  }

  async function verHistorico() {
    if (historico !== null) {
      setHistorico(null)
      return
    }

    setErro('')

    try {
      setHistorico(
        await chamarApi<HistoricoOrcamento[]>(
          `/orcamentos/${orcamento.id}/historico`,
        ),
      )
    }
    catch (e) {
      if (e instanceof ErroApi && e.status === 401) {
        onSessaoExpirada()
        return
      }

      setErro(mensagemDoErro(e, 'Não foi possível carregar o histórico.'))
    }
  }

  return (
    <>
      {erro && (
        <div className="alert alert-danger" role="alert">
          {erro}
        </div>
      )}

      <dl className="row">
        <dt className="col-sm-3">Orçamento</dt>
        <dd className="col-sm-9">
          nº {orcamento.id}{' '}
          <span className={`badge ${SITUACOES_ORCAMENTO[orcamento.situacao].classe}`}>
            {SITUACOES_ORCAMENTO[orcamento.situacao].rotulo}
          </span>
        </dd>
        <dt className="col-sm-3">Paciente</dt>
        <dd className="col-sm-9">{orcamento.paciente.nome}</dd>
        <dt className="col-sm-3">Dentista</dt>
        <dd className="col-sm-9">{orcamento.dentista?.nome ?? '—'}</dd>
        <dt className="col-sm-3">Válido até</dt>
        <dd className="col-sm-9">
          {orcamento.valido_ate === null
            ? '—'
            : formatarDiaCivil(orcamento.valido_ate)}
        </dd>
        <dt className="col-sm-3">Criado</dt>
        <dd className="col-sm-9">
          {formatarDataHora(orcamento.criado_em)} por {orcamento.criado_por.nome}
        </dd>

        {orcamento.decidido_em !== null && orcamento.decidido_por !== null && (
          <>
            <dt className="col-sm-3">Decidido</dt>
            <dd className="col-sm-9">
              {formatarDataHora(orcamento.decidido_em)} por{' '}
              {orcamento.decidido_por.nome}
            </dd>
          </>
        )}
      </dl>

      <table className="table table-striped table-sm align-middle">
        <thead>
          <tr>
            <th>Procedimento</th>
            <th>Valor unitário</th>
            <th>Quantidade</th>
            <th>Subtotal</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {orcamento.itens.length === 0 && (
            <tr>
              <td colSpan={5} className="text-secondary">
                Nenhum item.
              </td>
            </tr>
          )}

          {orcamento.itens.map((item) => {
            const editando = quantidades[item.id] ?? String(item.quantidade)

            return (
              <tr key={item.id}>
                <td>{item.nome_procedimento}</td>
                <td>{formatarReais(item.valor_unitario_centavos)}</td>
                <td>
                  {clinico && pendente ? (
                    <input
                      aria-label={`Quantidade de ${item.nome_procedimento}`}
                      className="form-control form-control-sm w-auto"
                      value={editando}
                      onChange={(e) =>
                        setQuantidades({ ...quantidades, [item.id]: e.target.value })
                      }
                    />
                  ) : (
                    item.quantidade
                  )}
                </td>
                <td>{formatarReais(item.subtotal_centavos)}</td>
                <td>
                  {clinico && pendente && (
                    <div className="d-flex gap-1 justify-content-end">
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        disabled={enviando || editando === String(item.quantidade)}
                        onClick={() => salvarQuantidade(item.id)}
                      >
                        Salvar quantidade
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        disabled={enviando}
                        onClick={() => removerItem(item.id)}
                      >
                        Remover
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr>
            <th colSpan={3}>Total</th>
            <th>{formatarReais(orcamento.total_centavos)}</th>
            <th></th>
          </tr>
        </tfoot>
      </table>

      {clinico && pendente && (
        <>
          <h3 className="h6 mt-4">Adicionar item</h3>
          <div className="row g-2 mb-3">
            <div className="col-12 col-md-5">
              <label htmlFor="novo-procedimento" className="form-label">
                Procedimento
              </label>
              <select
                id="novo-procedimento"
                className="form-select"
                value={novoProcedimento}
                onChange={(e) => setNovoProcedimento(e.target.value)}
              >
                <option value="">Selecione</option>
                {catalogo.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome} — {formatarReais(item.valor_centavos)}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-6 col-md-2">
              <label htmlFor="nova-quantidade" className="form-label">
                Quantidade
              </label>
              <input
                id="nova-quantidade"
                className="form-control"
                value={novaQuantidade}
                onChange={(e) => setNovaQuantidade(e.target.value)}
              />
            </div>

            <div className="col-6 col-md-2 d-flex align-items-end">
              <button
                type="button"
                className="btn btn-outline-primary"
                disabled={enviando}
                onClick={adicionarItem}
              >
                Adicionar
              </button>
            </div>
          </div>

          <h3 className="h6">Dados do orçamento</h3>
          <div className="row g-2 mb-3">
            <div className="col-12 col-md-5">
              <label htmlFor="dentista" className="form-label">
                Dentista responsável
              </label>
              <select
                id="dentista"
                className="form-select"
                value={dentistaId}
                onChange={(e) => setDentistaId(e.target.value)}
              >
                <option value="">Sem dentista</option>
                {orcamento.dentista !== null &&
                  !dentistas.some((d) => d.id === orcamento.dentista?.id) && (
                    <option value={orcamento.dentista.id}>
                      {orcamento.dentista.nome}
                    </option>
                  )}
                {dentistas.map((dentista) => (
                  <option key={dentista.id} value={dentista.id}>
                    {dentista.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-md-3">
              <label htmlFor="valido" className="form-label">
                Válido até
              </label>
              <input
                id="valido"
                className="form-control"
                type="date"
                value={validoAte}
                onChange={(e) => setValidoAte(e.target.value)}
              />
            </div>

            <div className="col-12 col-md-2 d-flex align-items-end">
              <button
                type="button"
                className="btn btn-outline-primary"
                disabled={enviando}
                onClick={salvarCabecalho}
              >
                Salvar dados
              </button>
            </div>
          </div>
        </>
      )}

      {clinico && (
        <div className="mb-3">
          <h3 className="h6">Decisão</h3>

          <div className="row g-2">
            <div className="col-12 col-md-6">
              <label htmlFor="motivo" className="form-label">
                Motivo{pendente ? ' (opcional)' : ' (obrigatório)'}
              </label>
              <input
                id="motivo"
                className="form-control"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-2 d-flex flex-wrap gap-2">
            {pendente && (
              <>
                <button
                  type="button"
                  className="btn btn-success"
                  disabled={enviando}
                  onClick={() => decidir('APROVADO')}
                >
                  Aprovar
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={enviando}
                  onClick={() => decidir('RECUSADO')}
                >
                  Recusar
                </button>
              </>
            )}

            {decidido && (
              <>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  disabled={enviando}
                  onClick={corrigir}
                >
                  Corrigir para {SITUACOES_ORCAMENTO[outraSituacao].rotulo.toLowerCase()}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  disabled={enviando}
                  onClick={reabrir}
                >
                  Reabrir
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="d-flex flex-wrap gap-2 align-items-center">
        <a
          href={`${apiBase}/orcamentos/${orcamento.id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline-secondary"
        >
          Abrir PDF do orçamento
        </a>
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={verHistorico}
        >
          {historico === null ? 'Ver histórico' : 'Ocultar histórico'}
        </button>
        <Link to="/orcamentos" className="btn btn-outline-secondary">
          Voltar
        </Link>
      </div>

      <p className="text-secondary small mt-2 mb-0">
        O PDF é um documento de orçamento e não comprova pagamento.
      </p>

      {historico !== null && (
        <div className="mt-3">
          {historico.map((item) => (
            <div key={item.id}>
              {formatarDiaCivil(diaDoInstante(item.registrado_em))}{' '}
              {formatarDataHora(item.registrado_em).slice(-5)} —{' '}
              {TIPOS_HISTORICO_ORCAMENTO[item.tipo]} por {item.usuario.nome}:{' '}
              {item.situacao_anterior === null
                ? SITUACOES_ORCAMENTO[item.situacao_nova].rotulo
                : `${SITUACOES_ORCAMENTO[item.situacao_anterior].rotulo} → ${SITUACOES_ORCAMENTO[item.situacao_nova].rotulo}`}
              {item.total_anterior_centavos !== null &&
                item.total_novo_centavos !== null &&
                item.total_anterior_centavos !== item.total_novo_centavos &&
                ` (total ${formatarReais(item.total_anterior_centavos)} → ${formatarReais(item.total_novo_centavos)})`}
              {item.motivo != null && ` — ${item.motivo}`}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
