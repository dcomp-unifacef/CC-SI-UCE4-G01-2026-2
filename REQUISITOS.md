# Requisitos do OdontoSystem

Aqui estão os requisitos do sistema e a situação de cada um. A lista vem do Backlog do Produto, que tem 30 estórias de usuário (US01 a US30). Para cada uma eu conferi no código e nas telas se o fluxo está disponível, e não só se existe a rota.

**Como ler a situação:**

- **Concluído:** o fluxo funciona no sistema.
- **Parcial:** funciona, mas falta alguma coisa que o backlog pedia.
- **Não implementado:** não foi feito.

Quando não deu para confirmar algum ponto, a observação diz "não verificado".

**Resumo:** 23 concluídos, 6 parciais (US04, US05, US06, US11, US14 e US25) e 1 não implementado (US30).

## Estórias obrigatórias (Must have)

| ID | O que o sistema deveria fazer | Situação | Observação |
|---|---|---|---|
| US01 | Entrar com usuário e senha. Mensagem genérica quando errar. Bloquear 1 minuto depois de 3 tentativas erradas. Mostrar nome e perfil de quem entrou. | Concluído | Tudo isso está no código e na tela. O bloqueio de 3 tentativas não foi testado pela tela. |
| US02 | Cadastrar usuários e escolher o perfil. Só o administrador acessa. Não deixar tirar o último administrador. | Concluído | O sistema tem três perfis (dono, dentista e secretária), e não dois como no backlog. O dono é quem administra. O último dono ativo não pode ser desativado. |
| US03 | Guardar a senha de forma protegida (o backlog diz "criptografada"), sem aparecer em tela nem em log. | Concluído | A solução usada é hash scrypt com sal. Hash não é criptografia: a senha não é guardada de um jeito que dê para desfazer e ler de novo. O sistema só compara o hash. A troca de senha gera um hash novo. Não revisei todos os logs do sistema um por um. |
| US04 | Cadastrar paciente com nome, CPF, nascimento e telefone. Validar o CPF. Impedir CPF repetido e mostrar a ficha que já existe. | Parcial | Os campos obrigatórios, a validação do CPF e a recusa de CPF repetido funcionam. Quando o CPF já existe, aparece só a mensagem, sem mostrar a ficha encontrada. |
| US05 | Buscar paciente por nome parcial ou CPF, com ou sem pontuação. Resultado em até 2 segundos com 5.000 pacientes. Desativados só com o filtro marcado. | Parcial | O filtro "Incluir desativados" vale só para a busca: com busca, os desativados só aparecem se ele estiver marcado. A lista inicial, sem busca, mostra todos os pacientes, inclusive os desativados (a coluna "Situação" mostra Ativo ou Desativado). O backlog pedia que desativados só aparecessem com o filtro marcado. A busca por nome foi testada. Não verificado: busca por CPF com pontuação e o tempo com 5.000 pacientes. |
| US06 | Editar os dados do paciente, menos o CPF. Registrar data, hora e usuário da alteração. Pedir confirmação ao sair sem salvar. | Parcial | A edição funciona, o CPF fica bloqueado e a confirmação ao sair existe. O sistema não guarda data, hora e usuário da alteração do paciente. |
| US07 | Agendar consulta com paciente, dentista, data, horário e duração. Só em data e hora futuras. | Concluído | Existe a opção "encaixe", que aceita começar até 30 minutos antes da hora atual. Isso não estava no backlog. |
| US08 | Impedir dois pacientes no mesmo horário do mesmo dentista. Mensagem com o paciente e o horário ocupado. Mostrar os horários ocupados na seleção. | Concluído | O bloqueio vale por dentista e a mensagem traz o paciente e o horário. Na hora de marcar, os horários ocupados aparecem em uma lista. Não é um calendário com cores. |
| US09 | Ver a agenda do dia com todos os dentistas, em ordem de horário, com cor por status e navegação para o dia anterior e o seguinte. | Concluído | Dá para filtrar por dentista. A cor é um selo colorido na coluna de situação. |
| US10 | Mudar o status da consulta (agendada, confirmada, realizada, faltou, cancelada), guardando data, hora e usuário. Sinalizar consulta passada sem status atualizado. | Concluído | O histórico da consulta mostra quem mudou e quando. A consulta passada aparece com "Situação a atualizar". |
| US11 | Registrar a visita automaticamente quando a consulta for realizada. Cancelada ou falta não gera visita. | Parcial | A visita é criada automaticamente quando a consulta é marcada como realizada, junto com o retorno, e a data e o dentista vêm da consulta. Consulta cancelada ou com falta não gera visita. Mas o profissional precisa informar o procedimento (escolhendo um item do catálogo ou digitando) ao registrar o atendimento. O backlog pedia que isso fosse "sem digitação adicional", então esse critério não é cumprido por inteiro. Conferido na tela. |
| US12 | Mostrar na ficha do paciente a data da última visita e o tempo em meses. Alerta para mais de 6 meses. "Sem histórico" quando não há visita. | Concluído | Conferido na tela. |
| US13 | Listar pacientes sem atendimento há 6, 9 ou 12 meses, com nome, telefone, última visita e último dentista. Ordenar por tempo de ausência e imprimir. Desativados fora da lista. | Concluído | O botão "Imprimir lista" usa a impressão do navegador. A impressão no papel não foi verificada. |
| US14 | Fazer backup do banco todo dia, em horário configurável, em pasta configurada, com a data no nome, mantendo os 7 mais recentes. Avisar o administrador no próximo login se falhar. | Parcial | O backup, o horário, a pasta, o nome com data e a retenção de 7 cópias estão no sistema. Só funciona com `BACKUP_DIR` e `PG_BIN_DIR` configurados e foi verificado no Windows. A API manda o aviso de falha no login, mas a tela só mostra o aviso na tela de Backup, e não ao entrar. |

## Estórias importantes (Should have)

| ID | O que o sistema deveria fazer | Situação | Observação |
|---|---|---|---|
| US15 | Desativar o paciente em vez de excluir, sem perder o histórico. | Concluído | A desativação é feita pela edição do paciente. O botão de excluir paciente não aparece na tela. |
| US16 | Reagendar ou cancelar consulta informando o motivo. | Concluído | O motivo é escolhido de uma lista e é obrigatório. O texto livre é só do dono e do dentista. |
| US17 | Mostrar um alerta com as consultas do dia ao abrir o sistema. | Concluído | A agenda é a tela inicial e avisa quantas consultas de hoje ainda aguardam confirmação. |
| US18 | Ver a agenda também por semana e por mês. | Concluído | A virada de mês e de ano foi testada. |
| US19 | Manter uma tabela de procedimentos com valores. | Concluído | O catálogo é editado só pelo dono e pelo dentista. |
| US20 | Criar a ficha de orçamento de um paciente adicionando procedimentos. | Concluído | Dono e dentista criam. A secretária só consulta. |
| US21 | Calcular o total do orçamento automaticamente. | Concluído | O cálculo é feito pelo servidor. O total foi conferido no PDF. |
| US22 | Aprovar ou recusar um orçamento. | Concluído | Também dá para corrigir a decisão e reabrir. |
| US23 | Consultar os orçamentos anteriores de um paciente. | Concluído | A lista de orçamentos é feita por paciente e pode filtrar pela situação. |
| US24 | Exportar o orçamento em PDF. | Concluído | O PDF foi aberto em um leitor e conferido (acentos, alinhamento e quebra de página). Impressão no papel não verificada. |
| US25 | Telas simples, com letras grandes e poucos cliques, para usar sem depender de ajuda. | Parcial | As letras e os botões foram aumentados e as telas funcionam em tela estreita. O teclado foi testado no login, no menu e na busca. Os cliques foram contados, como 3 para cadastrar um paciente. Não está comprovado que a recepcionista usa o sistema sem ajuda, porque isso depende de teste com ela. Também não foi verificado com leitor de tela nem com contraste. |
| US26 | Registrar o consentimento do paciente e guardar o log de quem acessou cada ficha (LGPD). | Concluído | O consentimento é registrado na ficha do paciente. O log de acesso só aparece para o dono. |

## Estórias desejáveis (Could have)

| ID | O que o sistema deveria fazer | Situação | Observação |
|---|---|---|---|
| US27 | Informar a data prevista de retorno ao encerrar a consulta. | Concluído | Ao registrar o atendimento, escolhe-se retorno em 3, 6 ou 12 meses. Não é uma data livre, mas a data pode ser corrigida depois, na tela de retornos. |
| US28 | Anotar observações clínicas em cada consulta realizada. | Concluído | O campo de observações fica na tela de registrar o atendimento e aparece na ficha da visita. Não verifiquei o que cada perfil enxerga. |
| US29 | Imprimir a agenda do dia. | Concluído | Usa a impressão do navegador, sem os botões. A impressão no papel não foi verificada. |
| US30 | Restaurar um backup pela tela do sistema. | Não implementado | Ficou fora desta entrega. A tela de Backup lista e gera cópias, mas não restaura. |

## Pontos gerais

- **Perfis:** o backlog fala em recepcionista e dentista. No sistema são três perfis: dono, dentista e secretária. O dono administra o sistema, o dentista faz o atendimento e a secretária cuida do cadastro e da agenda.
- **Tipo de aplicação:** o backlog previa uma aplicação desktop, com banco local. O que foi implementado é uma aplicação web (React no navegador, uma API e banco PostgreSQL). Essa é uma diferença em relação ao backlog.
- **Fora do escopo, como no backlog:** convênios, nota fiscal, módulo financeiro e acesso do paciente ao sistema não foram feitos.
- **Critérios de aceitação:** o backlog só detalha os critérios das 14 estórias obrigatórias. Para as demais, usei o texto da própria estória.
- **Testes de HTTPS:** os testes foram feitos com HTTP no computador. O cookie `Secure` e o HTTPS não foram verificados.
- **Outras coisas não verificadas:** outros navegadores, celular de verdade e leitor de tela.
- **Agenda:** ela não atualiza sozinha. Para ver consultas novas, é preciso recarregar a tela.
