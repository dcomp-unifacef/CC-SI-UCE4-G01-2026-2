import * as repository from "../repositories/retornoRepository.ts";
import * as historicoRepository from "../repositories/historicoRetornoRepository.ts";
import * as visitaRepository from "../repositories/historicoVisitaRepository.ts";
import * as acessoService from "./acessoService.ts";

import {
  Perfil,
  SituacaoRetorno,
  TipoAcessoPaciente,
} from "../../generated/prisma/client.ts";

import type {
  ResultadoDoRetorno,
  RetornoCompleto,
} from "../repositories/retornoRepository.ts";
import type { UsuarioAutenticado } from "./consultaService.ts";
import type { CadastroRetornoDto } from "../dto/retorno/cadastroRetornoDto.ts";
import type { AlteracaoDataRetornoDto } from "../dto/retorno/alteracaoDataRetornoDto.ts";
import type { DescarteRetornoDto } from "../dto/retorno/descarteRetornoDto.ts";
import type { RetornoRespostaDto } from "../dto/retorno/retornoRespostaDto.ts";
import type { HistoricoRetornoRespostaDto } from "../dto/retorno/historicoRetornoRespostaDto.ts";
import type { AtrasoRetornoRespostaDto } from "../dto/retorno/atrasoRetornoRespostaDto.ts";

import { BadRequestError } from "../errors/BadRequestError.ts";
import { ConflictError } from "../errors/ConflictError.ts";
import { NotFoundError } from "../errors/NotFoundError.ts";

import {
  converterDia,
  diasEntre,
  formatarDia,
  mesesCompletosEntre,
  subtrairMeses,
} from "../utils/datas.ts";
import {
  exigirCorpo,
  hoje,
  idDaQuery,
  inteiroObrigatorio,
  textoObrigatorio,
  validarId,
} from "../utils/validators.ts";


const MENSAGEM_DATA_INVALIDA = "Data inválida. Use o formato AAAA-MM-DD.";
const MENSAGEM_DATA_ANTERIOR =
  "A data prevista do retorno não pode ser anterior à data da visita.";
const MENSAGEM_JA_ABERTO = "A visita já possui um retorno aberto.";
const MENSAGEM_NAO_ABERTO_CORRIGIR =
  "Só é possível corrigir a data de um retorno aberto.";
const MENSAGEM_NAO_ABERTO_DESCARTAR =
  "Só é possível descartar um retorno aberto.";
const MENSAGEM_MESMA_DATA = "A data prevista informada é a mesma do retorno.";
const MENSAGEM_ALTERADO_POR_OUTRA_OPERACAO =
  "O retorno foi alterado por outra operação. Consulte novamente e tente de novo.";


function podeVerMotivos(usuario: UsuarioAutenticado): boolean {
  return usuario.perfil === Perfil.DONO || usuario.perfil === Perfil.DENTISTA;
}


function lerDia(corpo: Record<string, unknown>, campo: string): Date {
  const data = converterDia(textoObrigatorio(corpo, campo));

  if (data === null) {
    throw new BadRequestError(MENSAGEM_DATA_INVALIDA);
  }

  return data;
}


function paraResposta(
  retorno: RetornoCompleto,
  incluirMotivo: boolean
): RetornoRespostaDto {
  const base: RetornoRespostaDto = {
    id: retorno.id,
    paciente: {
      id: retorno.paciente.id,
      nome: retorno.paciente.nome,
      telefone: retorno.paciente.telefone,
    },
    visita_origem: {
      id: retorno.visita_origem.id,
      data_visita: formatarDia(retorno.visita_origem.data_visita),
      dentista_id: retorno.visita_origem.dentista_id,
    },
    data_prevista: formatarDia(retorno.data_prevista),
    situacao: retorno.situacao,
    criado_em: retorno.criado_em,
    encerrado_em: retorno.encerrado_em,
    encerrado_por_id: retorno.encerrado_por_id,
  };

  return incluirMotivo
    ? { ...base, motivo_descarte: retorno.motivo_descarte }
    : base;
}


function tratar(
  resultado: ResultadoDoRetorno,
  mensagemNaoAberto: string,
  incluirMotivo: boolean
): RetornoRespostaDto {
  switch (resultado.situacao) {
    case "ok":
      return paraResposta(resultado.retorno, incluirMotivo);
    case "nao_encontrado":
      throw new NotFoundError("Retorno não encontrado.");
    case "visita_nao_encontrada":
      throw new NotFoundError("Visita não encontrada.");
    case "ja_existe_aberto":
      throw new ConflictError(MENSAGEM_JA_ABERTO);
    case "paciente_inativo":
      throw new BadRequestError("Paciente desativado não pode ter retorno.");
    case "nao_aberto":
      throw new ConflictError(mensagemNaoAberto);
    case "sem_mudanca":
      throw new ConflictError(MENSAGEM_MESMA_DATA);
    case "alterada_por_outra_operacao":
      throw new ConflictError(MENSAGEM_ALTERADO_POR_OUTRA_OPERACAO);
  }
}


async function buscarOuFalhar(id: number): Promise<RetornoCompleto> {
  validarId(id);

  const retorno = await repository.findById(id);

  if (!retorno) {
    throw new NotFoundError("Retorno não encontrado.");
  }

  return retorno;
}


export async function findAll(
  query: Record<string, unknown>,
  usuario: UsuarioAutenticado
): Promise<RetornoRespostaDto[]> {
  const paciente_id = idDaQuery(query, "paciente_id");

  if (paciente_id === undefined) {
    throw new BadRequestError('Informe "paciente_id".');
  }

  const retornos = await repository.findByPaciente(paciente_id);

  const incluirMotivo = podeVerMotivos(usuario);

  if (retornos.length > 0) {
    await acessoService.registrarLista(
      usuario,
      TipoAcessoPaciente.LISTA_RETORNOS,
      retornos.map((retorno) => retorno.paciente.id)
    );
  }

  return retornos.map((retorno) => paraResposta(retorno, incluirMotivo));
}


export async function findById(
  id: number,
  usuario: UsuarioAutenticado
): Promise<RetornoRespostaDto> {
  const retorno = await buscarOuFalhar(id);

  await acessoService.registrar(
    usuario,
    TipoAcessoPaciente.RETORNO,
    retorno.paciente.id
  );

  return paraResposta(retorno, podeVerMotivos(usuario));
}


export async function atrasos(
  query: Record<string, unknown>,
  usuario: UsuarioAutenticado
): Promise<AtrasoRetornoRespostaDto[]> {
  const texto = query.meses;
  let meses = 6;

  if (texto !== undefined) {
    if (typeof texto !== "string" || !/^(6|9|12)$/.test(texto.trim())) {
      throw new BadRequestError('O parâmetro "meses" deve ser 6, 9 ou 12.');
    }

    meses = Number(texto.trim());
  }

  const hojeCivil = converterDia(hoje()) ?? new Date();
  const limite = subtrairMeses(hojeCivil, meses);

  const ultimas = await visitaRepository.findUltimasVisitasDePacientesAtivos();

  const lista = ultimas
    .filter((visita) => visita.data_visita.getTime() < limite.getTime())
    .sort(
      (a, b) =>
        a.data_visita.getTime() - b.data_visita.getTime() ||
        a.paciente_id - b.paciente_id
    )
    .map((visita) => {
      const aberto = visita.retornos.find(
        (retorno) => retorno.situacao === SituacaoRetorno.ABERTO
      );

      return {
        paciente: {
          id: visita.paciente.id,
          nome: visita.paciente.nome,
          telefone: visita.paciente.telefone,
        },
        ultima_visita: {
          id: visita.id,
          data_visita: formatarDia(visita.data_visita),
          dentista: {
            id: visita.dentista.id,
            nome: visita.dentista.nome,
          },
        },
        dias_desde: Math.max(0, diasEntre(visita.data_visita, hojeCivil)),
        meses_desde: mesesCompletosEntre(visita.data_visita, hojeCivil),
        retorno: aberto
          ? {
              id: aberto.id,
              data_prevista: formatarDia(aberto.data_prevista),
              vencido: aberto.data_prevista.getTime() < hojeCivil.getTime(),
            }
          : null,
        retorno_descartado:
          aberto === undefined &&
          visita.retornos.some(
            (retorno) => retorno.situacao === SituacaoRetorno.DESCARTADO
          ),
      };
    });

  if (lista.length > 0) {
    await acessoService.registrarLista(
      usuario,
      TipoAcessoPaciente.LISTA_ATRASOS,
      lista.map((item) => item.paciente.id)
    );
  }

  return lista;
}


export async function historico(
  id: number,
  usuario: UsuarioAutenticado
): Promise<HistoricoRetornoRespostaDto[]> {
  const retorno = await buscarOuFalhar(id);

  await acessoService.registrar(
    usuario,
    TipoAcessoPaciente.HISTORICO_RETORNO,
    retorno.paciente.id
  );

  const registros = await historicoRepository.findByRetorno(id);
  const incluirMotivo = podeVerMotivos(usuario);

  return registros.map((registro) => ({
    id: registro.id,
    tipo: registro.tipo,
    data_anterior:
      registro.data_anterior === null ? null : formatarDia(registro.data_anterior),
    data_nova:
      registro.data_nova === null ? null : formatarDia(registro.data_nova),
    situacao_anterior: registro.situacao_anterior,
    situacao_nova: registro.situacao_nova,
    ...(incluirMotivo ? { motivo: registro.motivo } : {}),
    registrado_em: registro.registrado_em,
    usuario: {
      id: registro.usuario.id,
      nome: registro.usuario.nome,
    },
  }));
}


export async function create(
  data: CadastroRetornoDto,
  usuario: UsuarioAutenticado
): Promise<RetornoRespostaDto> {
  const corpo = exigirCorpo(data);

  const visita_origem_id = inteiroObrigatorio(corpo, "visita_origem_id");
  validarId(visita_origem_id);

  const data_prevista = lerDia(corpo, "data_prevista");

  const visita = await visitaRepository.findById(visita_origem_id);

  if (!visita) {
    throw new NotFoundError("Visita não encontrada.");
  }

  if (data_prevista.getTime() < visita.data_visita.getTime()) {
    throw new BadRequestError(MENSAGEM_DATA_ANTERIOR);
  }

  const resultado = await repository.criar(
    { visita_origem_id, data_prevista },
    usuario.id
  );

  return tratar(resultado, MENSAGEM_JA_ABERTO, podeVerMotivos(usuario));
}


export async function corrigirData(
  id: number,
  data: AlteracaoDataRetornoDto,
  usuario: UsuarioAutenticado
): Promise<RetornoRespostaDto> {
  const corpo = exigirCorpo(data);

  const data_prevista = lerDia(corpo, "data_prevista");
  const motivo = textoObrigatorio(corpo, "motivo");

  const atual = await buscarOuFalhar(id);

  if (data_prevista.getTime() < atual.visita_origem.data_visita.getTime()) {
    throw new BadRequestError(MENSAGEM_DATA_ANTERIOR);
  }

  const resultado = await repository.corrigirData(
    id,
    { data_prevista, motivo },
    usuario.id
  );

  return tratar(
    resultado,
    MENSAGEM_NAO_ABERTO_CORRIGIR,
    podeVerMotivos(usuario)
  );
}


export async function descartar(
  id: number,
  data: DescarteRetornoDto,
  usuario: UsuarioAutenticado
): Promise<RetornoRespostaDto> {
  const corpo = exigirCorpo(data);

  const motivo = textoObrigatorio(corpo, "motivo");

  await buscarOuFalhar(id);

  const resultado = await repository.descartar(id, { motivo }, usuario.id);

  return tratar(
    resultado,
    MENSAGEM_NAO_ABERTO_DESCARTAR,
    podeVerMotivos(usuario)
  );
}
