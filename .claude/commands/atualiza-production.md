Faça deploy para produção seguindo estes passos:

1. Confirme com o usuário antes de prosseguir: "Tem certeza que quer fazer deploy para PRODUÇÃO?"
2. Verifique que está na branch beta: `git branch --show-current`
3. Rode `git log origin/main..origin/beta --oneline` para mostrar os commits que vão para prod
4. Crie um PR de beta para main usando: `gh pr create --base main --head beta --title "..." --body "..."`
   - O título deve resumir as mudanças incluídas
   - Se preferir merge direto (sem PR), pergunte ao usuário antes
5. Informe a URL do PR criado para o usuário revisar e aprovar

Regras:
- NUNCA fazer push direto para main — sempre via PR
- NUNCA usar --force
- Produção usa banco e Clerk isolados — mudanças de schema exigem atenção redobrada
