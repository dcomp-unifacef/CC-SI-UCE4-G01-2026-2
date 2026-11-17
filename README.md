# OdontoSystem

Projeto do Grupo 01 da UCE do 4º semestre de CC/SI 2026-2.

Alunos: Arthur Assis Garcia, Gabriel Letro Tozati, Hélio Abrahão de Paula e Kaique Fábio Teixeira Lima.

## O que é

O OdontoSystem é um sistema para o consultório odontológico. Ele cuida do cadastro de pacientes e dentistas, da agenda de consultas, do histórico de visitas, dos retornos e dos orçamentos (com PDF). Cada pessoa entra com login e senha e vê só o que o seu perfil permite: dono, dentista ou secretária.

## Tecnologias

- **Front-end:** React, TypeScript, Vite, Bootstrap e React Router.
- **Back-end:** Node.js, Express, TypeScript e Prisma.
- **Banco de dados:** PostgreSQL.

## O que precisa ter instalado

- Node.js 24 (foi a versão usada) e o npm.
- Um banco PostgreSQL só seu. Crie um banco vazio para rodar o projeto.
- O banco precisa permitir a criação da extensão `btree_gist`, que a Agenda usa para não deixar duas consultas no mesmo horário do dentista. As migrations criam a extensão, então o usuário do banco precisa ter essa permissão.
- Se quiser usar o backup, o `pg_dump` e o `pg_restore` do PostgreSQL.

## Como rodar o back-end

Abra um terminal na pasta `back-end` e siga a ordem:

1. Instale as dependências:

   ```
   npm install
   ```

2. Crie o arquivo `.env` a partir do exemplo (veja a parte de configuração abaixo):

   ```
   copy .env.example .env
   ```

   No Linux ou no Mac use `cp .env.example .env`.

3. Preencha o `.env` com os seus dados.

4. Crie as tabelas no banco:

   ```
   npx prisma migrate deploy
   ```

5. Gere o cliente do Prisma:

   ```
   npx prisma generate
   ```

6. Crie o primeiro usuário, que é o DONO, no banco novo:

   ```
   npx tsx scripts/primeiroDono.ts
   ```

   O script pede os dados no terminal: nome completo, login e senha. A senha tem de 8 a 128 caracteres, não aparece na tela e precisa ser digitada duas vezes. Ele precisa de um terminal interativo. Se já existir algum usuário no banco, ele não cria outro.

7. Inicie a API:

   ```
   npm run dev
   ```

   Para iniciar a versão compilada, use `npm start`. A API fica em `http://localhost:8888`.

## Como rodar o front-end

Abra outro terminal na pasta `front-end`:

1. Instale as dependências:

   ```
   npm install
   ```

2. Crie o arquivo `.env.local` a partir do exemplo:

   ```
   copy .env.local.example .env.local
   ```

   No Linux ou no Mac use `cp .env.local.example .env.local`.

3. Preencha o `.env.local` (veja abaixo).

4. Inicie o front-end:

   ```
   npm run dev
   ```

   Abra `http://localhost:5173` e entre com o usuário criado no passo 6 do back-end.

Para ver a versão compilada, rode `npm run build` e depois `npm run preview -- --port 5173 --strictPort`.

O back-end e o front-end precisam estar rodando ao mesmo tempo.

## Arquivos de ambiente

Os exemplos vêm sem valores. Copie, preencha com os seus dados e não envie os arquivos preenchidos para o repositório. Não coloque senha ou dados reais nos exemplos.

**`back-end/.env`**

- `DATABASE_URL`: o endereço do seu banco, no formato `postgresql://usuario:senha@localhost:5432/nome_do_banco`. Troque pelos seus dados.
- `ALLOWED_ORIGINS`: o endereço do front-end, por exemplo `http://localhost:5173`. Para mais de um, separe por vírgula.
- `COOKIE_SECURE`: deixe vazio quando for rodar com HTTP no computador. Use `true` só se o sistema estiver com HTTPS.
- `BACKUP_DIR`: a pasta onde os backups serão salvos. Precisa ser um caminho completo e ficar fora da pasta do projeto.
- `PG_BIN_DIR`: a pasta do PostgreSQL onde estão o `pg_dump` e o `pg_restore`. Também precisa ser um caminho completo.

Se `BACKUP_DIR` e `PG_BIN_DIR` ficarem vazios, o backup fica desligado. O sistema funciona do mesmo jeito sem ele.

O backup com as ferramentas do PostgreSQL foi verificado no Windows. Em outros sistemas não foi testado.

**`front-end/.env.local`**

- `VITE_API_BASE`: o endereço da API, por exemplo `http://localhost:8888`.

## Pendências

- A restauração de backup pela tela não foi feita. O backup só funciona se `BACKUP_DIR` e `PG_BIN_DIR` estiverem configurados.
- Na acessibilidade, as letras e os botões foram aumentados, mas não foi testado se a recepcionista consegue usar o sistema sem ajuda.
- Não foi testado com HTTPS nem com o cookie `Secure`. Os testes foram feitos só com HTTP no computador.
- Não foi testado em outros navegadores, no celular de verdade, com leitor de tela nem com o PDF impresso no papel.
- A agenda não atualiza sozinha. Para ver consultas novas, é preciso recarregar a tela.
- O botão de excluir paciente não aparece na tela. Para tirar um paciente de uso, a gente desativa o cadastro.
