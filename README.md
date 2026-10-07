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
   - `0005_scheduling.sql` — agenda: horário fixo de cada aluno, sessões
     geradas a partir dele, pedidos de troca de horário e notificações para
     o personal.
   - `0006_google_calendar.sql` — guarda a conexão com o Google Calendar de
     cada personal (opcional).
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

## Agenda

Você está no controle. No painel (`/agenda`):

- **Alunos fixos**: cadastre o dia da semana e horário de cada aluno
  recorrente. O sistema gera as sessões das próximas 4 semanas sozinho.
- **Sessões avulsas**: adicione ou mova qualquer sessão na mão, pra qualquer
  aluno, em qualquer data.
- **Pedidos de troca**: o aluno não marca nada por conta própria. Se ele quer
  outro horário, ele manda um pedido pela área dele (`/aluno/agenda`) e você
  aprova ou recusa — só então o horário muda de fato.

Quando um aluno manda um pedido, você recebe um aviso no sininho do painel
(atualiza sozinho) e vê os treinos do dia direto na Visão geral.

### Google Calendar (e iPhone)

Conectando sua conta do Google em `/agenda`, toda sessão que você cria, move
ou cancela aparece automaticamente no seu Google Calendar. Isso já resolve o
iPhone também: basta adicionar essa mesma conta Google em **Ajustes >
Calendário > Contas > Adicionar conta > Google** no celular, e os treinos
aparecem lá, sem nenhuma integração extra com a Apple.

Pra ativar, você precisa criar um app OAuth no Google Cloud (gratuito, uns 10
minutos):

1. Acesse [console.cloud.google.com](https://console.cloud.google.com/), crie
   um projeto novo (ou use um que já tenha).
2. Em **APIs e serviços → Biblioteca**, procure **Google Calendar API** e
   clique em **Ativar**.
3. Em **APIs e serviços → Tela de consentimento OAuth**, escolha **Externo**,
   preencha nome do app e seu e-mail, e salve. Não precisa publicar — só você
   vai usar, então pode deixar em modo de teste e se adicionar como usuário
   de teste.
4. Em **APIs e serviços → Credenciais → Criar credenciais → ID do cliente
   OAuth**, tipo **Aplicativo da Web**. Em **URIs de redirecionamento
   autorizados**, adicione:
   - `http://localhost:3000/api/google/callback` (pra testar local)
   - `https://seudominio.com/api/google/callback` (depois de publicar)
5. Copie o **Client ID** e o **Client secret** gerados e cole no
   `.env.local`:
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback
   ```
   (na Vercel, configure as mesmas três variáveis com a URL de produção).
6. Reinicie o site, abra `/agenda` e clique em **Conectar**.

### Mensagens (confirmação e feedback)

Mandar mensagem automática por WhatsApp exige conta paga em API (Twilio ou
Meta) e número comercial verificado — por decisão sua, isso fica de fora por
enquanto. Em vez disso, `/mensagens` deixa o texto pronto: mostra quem precisa
de confirmação (treino nas próximas 36h) e quem precisa de feedback (treino
que já aconteceu), com um botão que abre seu WhatsApp já com a mensagem
escrita — você só confere e manda.

## Publicando de verdade (sair do "modo teste")

Dá para publicar de graça na [Vercel](https://vercel.com) — conecte o
repositório e configure as mesmas variáveis de ambiente do `.env.local`. Depois
disso, é só usar seu domínio próprio (ou o domínio gratuito da Vercel) e
mandar o link `/login` para seus alunos.
