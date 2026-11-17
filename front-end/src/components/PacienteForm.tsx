import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { ErroApi, chamarApi, mensagemDoErro } from '../services/api'
import { formatarCpf } from '../utils/formatos'
import type { Paciente } from '../types/Paciente'

type PacienteFormProps = {
  paciente?: Paciente
  onSessaoExpirada: () => void
}

export function PacienteForm({ paciente, onSessaoExpirada }: PacienteFormProps) {
  const navigate = useNavigate()
  const edicao = paciente !== undefined

  const [nome, setNome] = useState(paciente?.nome ?? '')
  const [cpf, setCpf] = useState('')
  const [nascimento, setNascimento] = useState(
    paciente?.data_nascimento.slice(0, 10) ?? '',
  )
  const [telefone, setTelefone] = useState(paciente?.telefone ?? '')
  const [email, setEmail] = useState(paciente?.email ?? '')
  const [logradouro, setLogradouro] = useState(paciente?.logradouro ?? '')
  const [numero, setNumero] = useState(paciente?.numero ?? '')
  const [complemento, setComplemento] = useState(paciente?.complemento ?? '')
  const [bairro, setBairro] = useState(paciente?.bairro ?? '')
  const [municipio, setMunicipio] = useState(paciente?.municipio ?? '')
  const [uf, setUf] = useState(paciente?.uf ?? '')
  const [ativo, setAtivo] = useState(paciente?.ativo ?? true)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErro('')
    setEnviando(true)

    const corpo: Record<string, unknown> = {
      nome,
      data_nascimento: nascimento,
      telefone,
      email,
      logradouro,
      numero,
      complemento,
      bairro,
      municipio,
      uf,
    }

    if (edicao) {
      corpo.ativo = ativo
    }
    else {
      corpo.cpf = cpf
    }

    try {
      const salvo = await chamarApi<Paciente>(
        edicao ? `/pacientes/${paciente.id}` : '/pacientes',
        {
          method: edicao ? 'PATCH' : 'POST',
          body: JSON.stringify(corpo),
        },
      )

      navigate(`/pacientes/${salvo.id}`)
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
            ? 'Não foi possível salvar o paciente.'
            : 'Não foi possível cadastrar o paciente.',
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
          <label htmlFor="cpf" className="form-label">
            CPF
          </label>
          {edicao ? (
            <input
              id="cpf"
              className="form-control"
              value={formatarCpf(paciente.cpf)}
              disabled
            />
          ) : (
            <input
              id="cpf"
              className="form-control"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
            />
          )}
        </div>

        <div className="col-12 col-md-3">
          <label htmlFor="nascimento" className="form-label">
            Nascimento
          </label>
          <input
            id="nascimento"
            className="form-control"
            type="date"
            value={nascimento}
            onChange={(e) => setNascimento(e.target.value)}
          />
        </div>

        <div className="col-12 col-md-4">
          <label htmlFor="telefone" className="form-label">
            Telefone
          </label>
          <input
            id="telefone"
            className="form-control"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
          />
        </div>

        <div className="col-12 col-md-8">
          <label htmlFor="email" className="form-label">
            E-mail
          </label>
          <input
            id="email"
            className="form-control"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="col-12 col-md-8">
          <label htmlFor="logradouro" className="form-label">
            Logradouro
          </label>
          <input
            id="logradouro"
            className="form-control"
            value={logradouro}
            onChange={(e) => setLogradouro(e.target.value)}
          />
        </div>

        <div className="col-6 col-md-2">
          <label htmlFor="numero" className="form-label">
            Número
          </label>
          <input
            id="numero"
            className="form-control"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
          />
        </div>

        <div className="col-6 col-md-2">
          <label htmlFor="complemento" className="form-label">
            Complemento
          </label>
          <input
            id="complemento"
            className="form-control"
            value={complemento}
            onChange={(e) => setComplemento(e.target.value)}
          />
        </div>

        <div className="col-12 col-md-5">
          <label htmlFor="bairro" className="form-label">
            Bairro
          </label>
          <input
            id="bairro"
            className="form-control"
            value={bairro}
            onChange={(e) => setBairro(e.target.value)}
          />
        </div>

        <div className="col-8 col-md-5">
          <label htmlFor="municipio" className="form-label">
            Município
          </label>
          <input
            id="municipio"
            className="form-control"
            value={municipio}
            onChange={(e) => setMunicipio(e.target.value)}
          />
        </div>

        <div className="col-4 col-md-2">
          <label htmlFor="uf" className="form-label">
            UF
          </label>
          <input
            id="uf"
            className="form-control"
            value={uf}
            onChange={(e) => setUf(e.target.value)}
          />
        </div>

        {edicao && (
          <div className="col-12">
            <div className="form-check">
              <input
                id="ativo"
                className="form-check-input"
                type="checkbox"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
              />
              <label htmlFor="ativo" className="form-check-label">
                Cadastro ativo
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 d-flex gap-2">
        <button type="submit" className="btn btn-primary" disabled={enviando}>
          {enviando ? 'Salvando...' : edicao ? 'Salvar' : 'Cadastrar'}
        </button>
        <Link
          to={edicao ? `/pacientes/${paciente.id}` : '/pacientes'}
          className="btn btn-outline-secondary"
        >
          Voltar
        </Link>
      </div>
    </form>
  )
}
