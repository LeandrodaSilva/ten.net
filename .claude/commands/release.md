Crie um novo release para o pacote @leproj/tennet no JSR.

O argumento $ARGUMENTS indica o tipo de bump: patch, minor ou major. Se não informado, assume "patch".

Passos:

1. Leia a versão atual em `deno.json` (campo "version")
2. Incremente a versão de acordo com o tipo de bump:
   - patch: 0.1.22 → 0.1.23
   - minor: 0.1.22 → 0.2.0
   - major: 0.1.22 → 1.0.0
3. Atualize o campo "version" em `deno.json` com a nova versão
4. Execute `deno fmt` para garantir formatação
5. Execute todos os checks locais na sequência:
   - `deno fmt --check`
   - `deno lint --unstable-raw-imports`
   - `deno test --parallel --allow-all --unstable-raw-imports --unstable-bundle`
   - `deno check **/*.ts --unstable-raw-imports`
   - `deno publish --dry-run --allow-dirty`
6. Se algum check falhar, corrija o problema e repita
7. Faça commit de todas as alterações com mensagem no formato: `release: v{nova_versão}`
8. Crie a tag `v{nova_versão}`
9. Faça push do branch e da tag para origin
10. Monitore a pipeline do GitHub Actions até concluir com sucesso
