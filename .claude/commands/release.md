Crie um novo release para o pacote @leproj/tennet no JSR.

O argumento $ARGUMENTS indica o tipo de bump: patch, minor ou major. Se não
informado, assume "patch".

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
   - `deno test --parallel --allow-all --unstable-raw-imports --unstable-kv`
   - `deno check **/*.ts --unstable-raw-imports`
   - `deno publish --dry-run --allow-dirty`
6. Se algum check falhar, corrija o problema e repita
7. Faça commit das alterações de release com mensagem exatamente no formato:
   `release: v{nova_versão}`
8. Abra um PR com o mesmo título `release: v{nova_versão}`
9. Aguarde review + CI verde e faça merge do PR em `main`
10. Monitore a workflow `Release` do GitHub Actions no commit mergeado; ela
    publica no JSR e cria a tag `v{nova_versão}` + GitHub Release
11. Não crie/pushe tag manualmente e não faça push direto em `main`
