# Meu Personal — app da consultoria

Um site só + um banco de dados na nuvem — sem precisar publicar nada em loja de aplicativo:

1. **`apps/web`** — o site inteiro. Tem duas áreas:
   - **Painel do personal** (`/dashboard`, `/students`, `/exercises`) — você acessa
     pelo computador para cadastrar alunos, montar a biblioteca de exercícios e
     montar a ficha de treino de cada aluno.
   - **Área do aluno** (`/aluno`) — o aluno acessa pelo **link do seu domínio**,
     no navegador do celular dele. Vê o treino do dia, marca as séries feitas,
     registra cardio e acompanha o progresso. Não precisa instalar nada.
2. **`supabase/`** — o banco de dados (login, alunos, exercícios, treinos), hospedado
   de graça no [Supabase](https://supabase.com).

Depois de logar, o sistema já manda cada pessoa para a área certa automaticamente
(o `role` da conta na tabela `profiles` decide isso: `trainer` vai pro painel,
`student` vai pra área do aluno).

## 1. Criar o banco de dados (Supabase)

1. Crie uma conta grátis em [supabase.com](https://supabase.com) e um novo projeto.
2. No painel do projeto, vá em **SQL Editor**. Rode os arquivos de
   `supabase/migrations/` **em ordem** (0001, 0002, 0003, 0004) — cole
   o conteúdo de cada um e clique em **Run**:
   - `0001_init.sql` — cria as tabelas (alunos, exercícios, treinos) com as
     permissões corretas.
   - `0002_plan_validity_and_set_types.sql` — adiciona validade da ficha e
     séries de aquecimento/preparação.
   - `0003_execution_flow.sql` — adiciona avaliação de esforço, observações e
     foto de progresso ao concluir o treino (cria também um espaço de
     armazenamento gratuito no Supabase para guardar as fotos).
   - `0004_cardio.sql` — adiciona sessões de cardio.
   - `0005_scheduling.sql` — agenda de reposição: horários fixos, vagas geradas
     por semana, marcações dos alunos e notificações para o personal.
3. Vá em **Settings → API** e anote três valores: **Project URL**, a chave
   **anon public**, e a chave **service_role** (essa é secreta).

## 2. Rodar o site

```bash
cd apps/web
cp .env.example .env.local
# edite .env.local e cole a Project URL, a anon key e a service_role key
```

Na raiz do projeto:

```bash
pnpm install
pnpm dev:web
```

Abra http://localhost:3000 — a primeira tela pede login. Para criar sua conta
de personal, vá no painel do Supabase em **Authentication → Users → Add user**,
crie seu usuário com e-mail/senha, e depois em **Table Editor → profiles**
edite a linha criada automaticamente para `role = trainer` e preencha `full_name`.

Um aluno é criado pelo próprio painel (aba **Alunos → + Novo aluno**) — o
sistema já mostra e-mail e senha provisória para você enviar a ele. Esse
mesmo link (`seudominio.com/login`) é o que o aluno usa para entrar e cair
direto na área dele.

## Estrutura do projeto

```
apps/
  web/        o site inteiro — painel do personal + área do aluno (Next.js)
  mobile/     versão em app nativo (Expo) — não usada por enquanto,
              mantida no repositório caso queira publicar em loja no futuro
packages/
  shared/     tipos e utilitários usados pelo site (e pelo app mobile, se voltar a usar)
supabase/
  migrations/ esquema do banco de dados (SQL)
```

## Agenda de reposição

No painel do personal (`/agenda`) você cadastra os horários fixos em que abre
vaga pra reposição (dia da semana, hora de início/fim e quantas vagas por
horário). O sistema gera automaticamente as vagas das próximas 3 semanas.

O aluno marca a reposição pelo próprio app, em `/aluno/reposicao`, escolhendo
entre os horários que ainda têm vaga livre — e pode cancelar a marcação dele
a qualquer momento antes da aula.

Quando um aluno marca ou cancela, você recebe um aviso no sininho de
notificação do painel (atualiza automaticamente) e vê as aulas do dia direto
na Visão geral. Se um horário precisar ser cancelado por você, é só clicar em
"Cancelar" na vaga — as marcações dos alunos naquele horário são canceladas
junto.

Aviso por WhatsApp ainda não está ligado: isso exige uma conta em uma API de
mensagens (Twilio ou a API oficial da Meta) e um número comercial verificado,
o que não dá pra deixar pronto sem essas credenciais. A tabela de
notificações (`trainer_notifications`) já guarda cada aviso, então quando
você tiver a conta é só conectar um envio automático nela.

## Publicando de verdade (sair do "modo teste")

Dá para publicar de graça na [Vercel](https://vercel.com) — conecte o
repositório e configure as mesmas variáveis de ambiente do `.env.local`. Depois
disso, é só usar seu domínio próprio (ou o domínio gratuito da Vercel) e
mandar o link `/login` para seus alunos.
