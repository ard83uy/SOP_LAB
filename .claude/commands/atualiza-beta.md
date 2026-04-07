Faça deploy das mudanças atuais para o ambiente beta seguindo estes passos:

1. Rode `git status` e `git diff` para ver o que mudou
2. Se houver mudanças não commitadas, pergunte ao usuário uma mensagem de commit ou sugira uma baseada nas mudanças
3. Stage os arquivos relevantes e crie o commit
4. Rode `git push origin beta`
5. Confirme que o push foi bem-sucedido e informe que o Railway vai fazer o deploy automaticamente via GitOps

Regras:
- Nunca use --no-verify
- Nunca force push
- Se não houver nada para commitar, apenas faça o push dos commits pendentes
- Sempre inclua "Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>" no commit
