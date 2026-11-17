import { Link } from 'react-router'
import { formatarDiaCivil } from '../utils/datas'
import { ExcluirRegistro } from './ExcluirRegistro'
import type { Usuario } from '../types/Usuario'
import type { Visita } from '../types/Visita'

type VisitaFichaProps = {
  usuario: Usuario
  visita: Visita
  onSessaoExpirada: () => void
}

export function VisitaFicha({
  usuario,
  visita,
  onSessaoExpirada,
}: VisitaFichaProps) {
  const clinico = usuario.perfil !== 'SECRETARIA'

  return (
    <>
      <dl className="row">
        <dt className="col-sm-3">Data</dt>
        <dd className="col-sm-9">{formatarDiaCivil(visita.data_visita)}</dd>
        <dt className="col-sm-3">Paciente</dt>
        <dd className="col-sm-9">
          {visita.paciente.nome} ({visita.paciente.telefone})
        </dd>
        <dt className="col-sm-3">Dentista</dt>
        <dd className="col-sm-9">{visita.dentista.nome}</dd>
        <dt className="col-sm-3">Procedimento</dt>
        <dd className="col-sm-9">
          {clinico ? visita.procedimento : visita.procedimento_exibicao}
        </dd>

        {clinico && (
          <>
            <dt className="col-sm-3">Catálogo</dt>
            <dd className="col-sm-9">
              {visita.procedimentoCatalogo?.nome ?? 'Sem vínculo com o catálogo'}
            </dd>
            <dt className="col-sm-3">Observações</dt>
            <dd className="col-sm-9">{visita.observacoes ?? '—'}</dd>
          </>
        )}

        <dt className="col-sm-3">Origem</dt>
        <dd className="col-sm-9">
          {visita.consulta_id !== null
            ? 'Registrada a partir de uma consulta'
            : visita.registro_antigo
              ? 'Registro antigo'
              : 'Registro manual'}
        </dd>
      </dl>

      <div className="d-flex gap-2">
        {clinico && (
          <Link to={`/visitas/${visita.id}/editar`} className="btn btn-primary">
            Editar
          </Link>
        )}

        {clinico && (
          <Link
            to={`/visitas/${visita.id}/retorno`}
            className="btn btn-outline-primary"
          >
            Criar retorno
          </Link>
        )}

        <Link
          to={`/retornos/paciente/${visita.paciente_id}`}
          className="btn btn-outline-primary"
        >
          Retornos do paciente
        </Link>

        <Link to="/visitas" className="btn btn-outline-secondary">
          Voltar
        </Link>
      </div>

      {usuario.perfil === 'DONO' && (
        <ExcluirRegistro
          rotulo="Excluir visita"
          aviso="A exclusão é definitiva. Visitas com retorno vinculado ou geradas por uma consulta não podem ser excluídas."
          caminho={`/historico-visitas/${visita.id}`}
          destino="/visitas"
          onSessaoExpirada={onSessaoExpirada}
        />
      )}
    </>
  )
}
