# Quiz Journey Final

Aplicação de caça ao tesouro educativa construída com React, Vite, Tailwind CSS e Supabase.

## Funcionalidades
- Autenticação automática de alunos via código de turma
- Painel do aluno com selecção de turma ativa e progresso
- Mapas com localização do próximo ponto e geolocalização
- Digitalização de QR Code para validar locais
- Sistema de perguntas e pontuação de percurso
- Painel de professor para criar turmas, locais e perguntas

## Como executar
1. Copie o ficheiro de ambiente:
   ```bash
   cp .env.example .env
   ```
2. Preencha as variáveis em `.env` com o URL do Supabase e a chave publicável:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
3. Instale as dependências:
   ```bash
   npm install
   ```
4. Inicie em modo de desenvolvimento:
   ```bash
   npm run dev
   ```

## Scripts úteis
- `npm run dev` — iniciar o servidor de desenvolvimento
- `npm run build` — criar build de produção
- `npm run build:dev` — build de desenvolvimento
- `npm run lint` — verificar problemas de ESLint
- `npm run lint:fix` — corrigir problemas automáticos de lint
- `npm run test` — executar testes com Vitest
- `npm run typecheck` — verificar tipos TypeScript sem gerar ficheiros

## Variáveis de ambiente
```env
VITE_SUPABASE_URL=https://xyz.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-public-anon-key
```

## Melhorias aplicadas
- erro tratado em autenticação de sessão e perfil
- tratamento de falhas ao carregar dados do jogo
- mensagens de erro e recuperação mais robustas
- documentação inicial com setup e scripts

## Notas
- Certifique-se de que o projeto Supabase tem tabelas e políticas adequadas para `profiles`, `user_roles`, `classes`, `class_members`, `locations`, `questions`, `runs` e `answers`.
- Não partilhe chaves secretas no repositório.
