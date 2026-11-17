import { Link } from 'react-router'
import { formatarCpf } from '../utils/formatos'
import { formatarDataHora, formatarDiaCivil } from '../utils/datas'
import type { PacienteComConsentimento } from '../types/Paciente'
import type { Usuario } from '../types/Usuario'

type PacienteFichaProps = {
  usuario: Usuario
  paciente: PacienteComConsentimento
}

const CONSENTIMENTO = {
  SEM_REGISTRO: 'Sem registro',
  CONCEDIDO: 'Concedido',
  REVOGADO: 'Revogado',
}

function valor(texto: string | null): string {
  return texto === null || texto === '' ? '—' : texto
}

function endereco(paciente: PacienteComConsentimento): string {
  const rua = [paciente.logradouro, paciente.numero].filter(Boolean).join(', ')
  const cidade = [paciente.municipio, paciente.uf].filter(Boolean).join('/')

  return (
    [rua, paciente.complemento, paciente.bairro, cidade]
      .filter(Boolean)
      .join(' – ') || '—'
  )
}

export function PacienteFicha({ usuario, paciente }: PacienteFichaProps) {
  const gestao = usuario.perfil !== 'DENTISTA'
  const consentimento = paciente.consentimento

  return (
    <>
      <dl className="row">
        <dt className="col-sm-3">Nome</dt>
        <dd className="col-sm-9">{paciente.nome}</dd>
        <dt className="col-sm-3">CPF</dt>
        <dd className="col-sm-9">{formatarCpf(paciente.cpf)}</dd>
        <dt className="col-sm-3">Nascimento</dt>
        <dd className="col-sm-9">{formatarDiaCivil(paciente.data_nascimento)}</dd>
        <dt className="col-sm-3">Telefone</dt>
        <dd className="col-sm-9">{paciente.telefone}</dd>
        <dt className="col-sm-3">E-mail</dt>
        <dd className="col-sm-9">{valor(paciente.email)}</dd>
        <dt className="col-sm-3">Endereço</dt>
        <dd className="col-sm-9">{endereco(paciente)}</dd>
        <dt className="col-sm-3">Situação</dt>
        <dd className="col-sm-9">{paciente.ativo ? 'Ativo' : 'Desativado'}</dd>
        <dt className="col-sm-3">Consentimento</dt>
        <dd className="col-sm-9">
          {CONSENTIMENTO[consentimento.situacao]}
          {consentimento.registrado_em !== null &&
            ` em ${formatarDataHora(consentimento.registrado_em)}`}
          {consentimento.registrado_por !== null &&
            ` por ${consentimento.registrado_por.nome}`}
        </dd>
      </dl>

      <div className="d-flex gap-2">
        {gestao && (
          <Link
            to={`/pacientes/${paciente.id}/editar`}
            className="btn btn-primary"
          >
            Editar
          </Link>
        )}
        <Link to="/pacientes" className="btn btn-outline-secondary">
          Voltar
        </Link>
      </div>
    </>
  )
}
