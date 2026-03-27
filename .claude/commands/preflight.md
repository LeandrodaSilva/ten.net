Execute todos os checks de CI localmente para verificar se o código está pronto para publicação.

Rode cada comando na sequência abaixo e reporte o resultado consolidado:

1. `deno fmt --check` — Verificação de formatação
2. `deno lint --unstable-raw-imports` — Linter
3. `deno test --parallel --allow-all --unstable-raw-imports --unstable-bundle` — Testes
4. `deno check **/*.ts --unstable-raw-imports` — Type checking
5. `deno publish --dry-run --allow-dirty` — Simulação de publicação no JSR

Ao final, mostre um resumo com status de cada etapa (passou/falhou).
Se alguma etapa falhar, mostre o erro e sugira a correção.
