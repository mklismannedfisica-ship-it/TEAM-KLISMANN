# Meu Personal — app da consultoria

Duas partes + um banco de dados na nuvem:

1. **`apps/web`** — painel que você (personal) acessa pelo computador: cadastra
   alunos, monta a biblioteca de exercícios e monta a ficha de treino de cada aluno.
2. **`apps/mobile`** — app de celular (Android e iOS) que o aluno usa para ver o
   treino do dia, marcar as séries feitas e acompanhar o progresso.
3. **`supabase/`** — o banco de dados (login, alunos, exercícios, treinos), hospedado
   de graça no [Supabase](https://supabase.com).

## 1. Criar o banco de dados (Supabase)

1. Crie uma conta grátis em [supabase.com](https://supabase.com) e um novo projeto.
2. No painel do projeto, vá em **SQL Editor**, cole o conteúdo do arquivo
   `supabase/migrations/0001_init.sql` e clique em **Run**. Isso cria todas as
   tabelas (alunos, exercícios, treinos) já com as permissões corretas.
3. Vá em **Settings → API** e anote três valores: **Project URL**, a chave
   **anon public**, e a chave **service_role** (essa é secreta).

## 2. Rodar o painel web (computador)

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

## 3. Rodar o app do aluno (celular)

```bash
cd apps/mobile
cp .env.example .env
# edite .env e cole a Project URL e a anon key (a mesma do passo 1)
```

Na raiz do projeto:

```bash
pnpm dev:mobile
```

Isso abre o Expo. Instale o app **Expo Go** no seu celular (Android/iOS),
escaneie o QR code que aparece no terminal, e o app abre no seu celular.

Um aluno é criado pelo próprio painel web (aba **Alunos → + Novo aluno**) —
o sistema já mostra e-mail e senha provisória para você enviar a ele.

## Estrutura do projeto

```
apps/
  web/        painel do personal (Next.js)
  mobile/     app do aluno (Expo / React Native)
packages/
  shared/     tipos e utilitários usados pelos dois apps
supabase/
  migrations/ esquema do banco de dados (SQL)
```

## Publicando de verdade (sair do "modo teste")

- **Painel web**: dá para publicar de graça na [Vercel](https://vercel.com) —
  conecte o repositório e configure as mesmas variáveis de ambiente do `.env.local`.
- **App do aluno**: quando estiver pronto para a loja, use o
  [EAS Build](https://docs.expo.dev/build/introduction/) da Expo para gerar o
  instalável e publicar na Google Play e na App Store.
- **Ícones**: os ícones e a tela de splash em `apps/mobile/assets` são
  placeholders (cor verde sólida). Substitua pelos ícones da sua marca antes
  de publicar.
