# Testes

Gabriel Letro ficou responsável pela área de QA da aplicação. Foram realizados testes manuais no navegador nas seguintes funcionalidades:

## Acesso e sessão

- Login com usuário e senha, nos três perfis (dono, dentista e secretária).
- Mensagem de erro quando o login ou a senha estão errados.
- A pessoa continua logada ao recarregar a página.
- Sair do sistema.
- Quando não há sessão ou a sessão expira, o sistema volta para o login com um aviso.
- Cada perfil vê só o menu e as telas que pode usar. Quem não tem permissão é levado de volta para a agenda.
- Troca da própria senha: a senha antiga deixa de valer, a nova funciona e o sistema volta para o login.

## Pacientes

- Cadastro de paciente, com mensagens para formulário vazio, CPF inválido, CPF repetido, e-mail inválido e data de nascimento futura.
- Busca por nome e pelo começo do CPF, com e sem pacientes desativados.
- Ficha do paciente.
- Edição dos dados (o CPF não pode ser alterado).
- Desativar e reativar paciente. A desativação é recusada quando o paciente tem consulta futura.
- Última visita na ficha, com o tempo desde o último atendimento, o aviso de mais de 6 meses e o texto "Sem histórico".
- Confirmação ao sair do cadastro com alterações não salvas.
- Consentimento do paciente: registrar concessão e revogação, nos três perfis.

## Agenda

- Agenda do dia, da semana e do mês, com os botões Anterior, Hoje e Próximo, inclusive na virada de mês e de ano.
- Filtro por dentista.
- Marcar consulta, inclusive o encaixe, com a lista de horários já ocupados do dentista.
- Mensagens de recusa para horário ocupado, duração acima do limite e data passada.
- Confirmar consulta.
- Marcar falta, em duas etapas.
- Cancelar consulta com motivo.
- Reagendar consulta com motivo, com recusa de horário ocupado.
- Registrar o atendimento, escolhendo um item do catálogo e o prazo do retorno (3, 6 ou 12 meses). Isso cria a visita e o retorno.
- Recusa de registrar atendimento ou falta antes do horário da consulta.
- Histórico de cada consulta, com quem mudou, quando e o motivo.
- A secretária vê só o motivo escolhido na lista. O texto livre do motivo é do dono e do dentista.
- Aviso de consultas de hoje aguardando confirmação.
- Sinalização "Situação a atualizar" nas consultas passadas sem status final.
- Botão Imprimir, que abre a impressão do navegador.

## Dentistas, visitas e retornos

- Cadastro, edição e desativação de dentista.
- Visitas: registrar, editar e registrar visita antiga.
- Retornos: criar, corrigir a data prevista, descartar e ver o histórico.
- Contatos com o paciente sobre o retorno.
- Lista de pacientes em atraso, com ordenação pelo tempo de ausência.
- Exclusão de dentista e de visita pelo dono, com confirmação em duas etapas. Quando a exclusão é bloqueada, aparece a mensagem da API.

## Catálogo e orçamentos

- Catálogo de procedimentos: criar e editar.
- Orçamentos: criar, adicionar itens, aprovar ou recusar, corrigir a decisão, reabrir e ver o histórico.
- Total do orçamento calculado automaticamente.
- PDF do orçamento, aberto em um leitor de PDF, com acentos, alinhamento das colunas e quebra de página corretos.

## Administração (dono)

- Usuários: listar, criar, editar, desativar e redefinir a senha.
- Configurações do sistema (tempos de sessão, duração máxima da consulta e horário do backup).
- Tela de backup, com a lista de execuções e os avisos.
- Log de acesso, com filtros.
- Secretária e dentista não veem essas telas e são redirecionados quando tentam abrir pelo endereço.

## Aparência e uso

- Letras e botões maiores.
- Telas em largura de celular (375 px) sem rolagem horizontal da página.
- Navegação pelo teclado no login, no menu e na busca.
- Mensagens claras quando a API está fora do ar ou indisponível, com o botão "Tentar novamente".
