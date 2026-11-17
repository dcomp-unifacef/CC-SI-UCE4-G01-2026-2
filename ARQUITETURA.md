# Arquitetura do OdontoSystem

Aqui eu explico como o sistema foi organizado. Para rodar o projeto, veja o README.

## Como as partes se relacionam

O sistema tem três partes:

```
Navegador (front-end, React)
        |
        |  requisições HTTP em JSON, com o cookie da sessão
        v
API (back-end, Node.js + Express)   porta 8888
        |
        |  Prisma
        v
Banco de dados (PostgreSQL)
```

- O **front-end** é o que a pessoa vê no navegador. Ele não acessa o banco. Para tudo, ele chama a API.
- O **back-end** é a API. Ela recebe os pedidos, confere quem está logado e se a pessoa pode fazer aquilo, aplica as regras e fala com o banco.
- O **banco de dados** guarda todos os dados. Algumas regras ficam no próprio banco, como veremos mais abaixo.

O front-end e o back-end rodam em endereços diferentes. A API usa CORS para informar ao navegador quais origens podem acessar suas respostas, inclusive nas requisições com credenciais. O CORS sozinho não impede que outros programas façam pedidos à API. Por isso existem outras proteções, explicadas mais abaixo: o login, a sessão, as permissões e a verificação do `Origin`.

## Tecnologias

- **Front-end:** React 19, TypeScript, Vite 8, Bootstrap 5 e React Router. O lint é feito com o Oxlint.
- **Back-end:** Node.js, Express 5 e TypeScript. O acesso ao banco é feito com o Prisma 7 e o driver `pg`. Também usa `cookie-parser` (ler o cookie), `cors`, `morgan` (log das requisições) e `pdfkit` (gerar o PDF do orçamento).
- **Banco:** PostgreSQL, com a extensão `btree_gist`.
- **Testes do back-end:** os testes ficam na pasta `tests` e rodam com o `node:test` e o `tsx`.

## Back-end: camadas e pastas

O código do back-end fica em `back-end/src` e é dividido em camadas. Um pedido passa por elas nesta ordem:

```
routes  ->  controllers  ->  services  ->  repositories  ->  Prisma / banco
```

| Pasta | Para que serve |
|---|---|
| `routes` | Define os endereços da API e quais perfis podem usar cada um. |
| `controllers` | Recebe o pedido, chama o service e devolve a resposta. Não tem regra de negócio. |
| `services` | Tem as regras do sistema (por exemplo: não marcar consulta no passado, exigir motivo para cancelar). |
| `repositories` | Só conversa com o banco, usando o Prisma. |
| `dto` | Os formatos dos dados que entram e saem da API. |
| `middlewares` | Passos que rodam antes das rotas: `autenticar`, `exigirPerfil`, `exigirPerfilPorMetodo`, `verificarOrigem` e o `errorHandler`. |
| `errors` | Os tipos de erro (`BadRequestError`, `ConflictError`, `ForbiddenError`, `NotFoundError`, `UnauthorizedError`, `ServiceUnavailableError`). |
| `utils` | Funções de apoio: validar CPF, hash de senha, token, cookie, datas, dinheiro e backup. |
| `database` | Cria o cliente do Prisma e guarda os números das travas usadas em operações que não podem rodar ao mesmo tempo. |
| `bin/server.ts` | Inicia o servidor e o agendador do backup diário. |

Outras pastas do back-end:

- `prisma`: o `schema.prisma` e as migrations (20 até agora).
- `generated`: o cliente do Prisma, gerado a partir do schema.
- `scripts`: o script que cria o primeiro usuário DONO.
- `tests`: os testes.

Quando acontece um erro previsto (por exemplo, CPF repetido), o service lança um dos erros da pasta `errors`. O `errorHandler`, que roda por último, transforma o erro em uma resposta JSON com o campo `message` e o código HTTP certo. Erros não previstos viram uma resposta genérica de erro interno.

**Exemplo: marcar uma consulta.** A rota `POST /consultas` só deixa passar dono e secretária. O controller chama o `consultaService`, que valida os dados e confere a regra do horário: a consulta comum precisa ser em data e hora futuras. A exceção, que foi aprovada, é o encaixe (para atendimento imediato), que pode começar até 30 minutos antes do momento atual. O service também confere se não há conflito de horário. O `consultaRepository` grava a consulta e o histórico dela. O banco ainda tem sua própria trava contra horários sobrepostos, como veremos no final.

## Front-end: pastas

O código do front-end fica em `front-end/src`:

| Item | Para que serve |
|---|---|
| `main.tsx` | Ponto de entrada. Carrega o Bootstrap e o `estilos.css`. |
| `App.tsx` | Define as rotas (React Router), guarda o usuário logado, monta o cabeçalho e o menu de acordo com o perfil e redireciona quando a pessoa não pode ver a tela. |
| `components` | As telas e os formulários (agenda, pacientes, visitas, retornos, orçamentos, usuários, backup e outras). |
| `services/api.ts` | A função `chamarApi`, que faz as chamadas à API com o cookie da sessão e transforma as falhas em mensagens para a tela. Nem todo acesso passa por ela: o PDF do orçamento, por exemplo, é aberto por um link direto para a API, e o navegador envia o cookie. |
| `types` | Os tipos das respostas da API. |
| `utils` | Funções de datas e de formatação (como CPF e tamanho de arquivo). |
| `estilos.css` | Ajustes de visual sobre o Bootstrap, como o tamanho maior das letras. |

Cada tela chama a API por conta própria. Quando a API responde 401 (sessão vencida), a tela avisa o `App`, que volta para o login. O controle de estado é simples, sem biblioteca de estado global: o usuário logado fica no `App` e as telas recebem o que precisam.

## Login, sessão e permissões

**Login.** A tela de login manda o usuário e a senha para `POST /sessoes`. A API:

1. Procura o usuário pelo login. Se não existe ou está desativado, responde com a mesma mensagem de login inválido. A mensagem não diz qual campo errou.
2. Confere a senha. A senha não é armazenada em texto no banco: fica guardado só o **hash scrypt com sal**. Na conferência, o sistema calcula o hash da senha digitada e compara com o que está gravado.
3. Depois de 3 tentativas erradas, bloqueia o login do usuário por 1 minuto.
4. Se deu certo, cria uma sessão: gera um token aleatório de 32 bytes e manda esse token em um cookie chamado `odonto_sessao`.

**Cookie e sessão.** O cookie é `HttpOnly` (o JavaScript da página não consegue ler) e `SameSite=Lax`. Ele só é `Secure` se `COOKIE_SECURE=true`. No banco, a tabela `Sessao` guarda apenas o **hash SHA-256 do token**, e não o token. Isso reduz a exposição do token: quem lê a tabela não encontra o valor que vai no cookie. Não é uma garantia absoluta, porque a proteção também depende do resto (cookie `HttpOnly`, expiração e revogação da sessão).

**A cada pedido.** O middleware `autenticar` lê o cookie, calcula o hash e procura a sessão. Ele recusa com 401 se a sessão não existe, foi revogada, o usuário foi desativado, passou da duração máxima ou ficou parada tempo demais (inatividade). Os tempos ficam na tabela `Configuracao`; os valores iniciais são 480 minutos de duração máxima e 30 minutos de inatividade. O dono pode mudar esses valores na tela de configurações.

**Saída da sessão.** O logout (`DELETE /sessoes/atual`) revoga a sessão. A troca de senha também encerra as sessões do usuário. Ao abrir o sistema, o front-end chama `GET /sessoes/atual` para saber se já existe uma sessão e quem é o usuário.

**Verificação do `Origin`.** Isso é separado do CORS. Nas requisições que alteram dados (POST, PUT, PATCH e DELETE), o middleware `verificarOrigem` exige o cabeçalho `Origin` com um endereço da lista de permitidos. Se o cabeçalho não existir ou não estiver na lista, a API responde 403. Isso ajuda a barrar pedidos feitos por outros sites no navegador. Quem não usa navegador consegue enviar o cabeçalho que quiser, então essa verificação não substitui o login e as permissões.

**Permissões.** Há três perfis: `DONO`, `DENTISTA` e `SECRETARIA`. A checagem principal é feita na API (`exigirPerfil` e `exigirPerfilPorMetodo`), e o front-end só esconde os botões e as telas que a pessoa não pode usar. Em linhas gerais:

| Perfil | O que pode fazer |
|---|---|
| **Dono** | Tudo. Só ele gerencia usuários, configurações, backups e o log de acesso, e só ele exclui dentista e visita e descarta retornos. |
| **Dentista** | Atende: registra o atendimento e as visitas, cria e corrige retornos (a data prevista), faz orçamentos e mantém o catálogo de procedimentos. Só consulta os cadastros de pacientes e dentistas. |
| **Secretária** | Cadastra e edita pacientes e cuida da agenda (marcar, reagendar, cancelar, confirmar). Não registra atendimento e só consulta os orçamentos. |

Todos os perfis podem trocar a própria senha e registrar o consentimento do paciente. Quando alguém abre a ficha de um paciente ou uma lista com dados de pacientes, a API grava uma linha no log de acesso (tabela `LogAcesso`), para a parte da LGPD.

## Banco de dados: principais tabelas e relações

O banco tem 18 tabelas, criadas pelas migrations do Prisma. As principais, por assunto:

- **Acesso:** `Usuario` (com o perfil), `Sessao` (uma por login) e `Configuracao` (uma única linha com os tempos de sessão, a duração máxima da consulta e o horário do backup).
- **Cadastros:** `Paciente` e `Dentista`.
- **Agenda:** `Consulta` e `HistoricoConsulta` (cada mudança de status, com o usuário e o motivo).
- **Atendimento e retorno:** `HistoricoVisita`, `Retorno`, `HistoricoRetorno` e `ContatoRetorno`.
- **Orçamentos:** `Procedimento` (o catálogo com os valores), `Orcamento`, `ItemOrcamento` e `HistoricoOrcamento`.
- **Segurança e LGPD:** `ConsentimentoPaciente` e `LogAcesso`.
- **Backup:** `BackupExecucao` (cada backup feito, com situação, arquivo e erro, se houver).

Relações principais:

```
Usuario     1 --- N  Sessao
Paciente    1 --- N  Consulta, HistoricoVisita, Retorno, Orcamento,
                     ConsentimentoPaciente, LogAcesso, ContatoRetorno
Dentista    1 --- N  Consulta, HistoricoVisita, Orcamento (opcional)
Consulta    1 --- N  HistoricoConsulta
Consulta    1 --- 0..1 HistoricoVisita   (visita criada ao realizar)
HistoricoVisita 1 --- N  Retorno
Retorno     1 --- N  HistoricoRetorno
Orcamento   1 --- N  ItemOrcamento, HistoricoOrcamento
Procedimento 1 --- N ItemOrcamento       (e, opcional, HistoricoVisita)
Usuario     1 --- N  registros de histórico, consentimento e log
```

Algumas regras ficam no próprio banco, e não só no código:

- **Sem sobreposição de horário:** a tabela `Consulta` tem uma restrição (`EXCLUDE`, que usa a extensão `btree_gist`) que impede duas consultas do mesmo dentista ao mesmo tempo. Ela vale para consultas agendadas, confirmadas e realizadas. Mesmo que o código falhe, o banco não aceita o conflito.
- **Não apagar histórico:** quase todas as chaves estrangeiras usam `Restrict`, ou seja, não dá para apagar um paciente ou dentista que tenha histórico ligado a ele. Por isso o sistema desativa (campo `ativo`) em vez de excluir. A exceção é a `Sessao`, que é apagada junto com o usuário.
- **Dados válidos:** há restrições `CHECK`, por exemplo no nome do procedimento e no motivo do cancelamento.
- **Operações simultâneas:** em alguns pontos o back-end usa travas do PostgreSQL (`pg_advisory_xact_lock`) para duas pessoas não alterarem a mesma coisa ao mesmo tempo, como na criação do primeiro dono, nas visitas do paciente, no consentimento, no catálogo de procedimentos e na configuração.
