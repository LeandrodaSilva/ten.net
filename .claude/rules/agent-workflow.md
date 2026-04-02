---
description: Protocolo de workflow com agentes — delegação, papéis, modelos, TeamCreate, CI
---

# Agent Workflow Protocol

## 1. Delegação obrigatória

Nunca fazer correções ou implementações diretamente se existir um agente do time capaz de executar a tarefa. Sempre delegar via Agent tool com o papel correto.

**Why:** Leandro quer que o workflow do time de agentes seja respeitado fielmente. O coordenador (PO/eu) deve criar tasks, distribuir para os agentes certos, e acompanhar — não executar o trabalho ele mesmo. Isso garante separação de responsabilidades e consistência no processo.

**How to apply:** Ao receber uma demanda:
1. Criar tasks via TaskCreate
2. Distribuir cada task para o agente correto via Agent tool (backend-dev, frontend-dev, testing, security, devops, ui-ux, requirements)
3. Apenas coordenar, revisar resultados, e corrigir se um agente falhar
4. Nunca usar Edit/Write diretamente para código de produção ou testes — delegar ao agente responsável
5. Exceção: correções triviais de 1 linha para desbloquear um agente (ex: fix de import) podem ser feitas diretamente, mas informar ao usuário

## 2. Separação de papéis

Cada agente do time deve executar APENAS as atividades do seu papel. Se precisar de ajustes ou correções que fogem do seu escopo, deve acionar o membro correto do time via SendMessage.

### Regras por papel

**Backend**: Implementa código de servidor, models, storage, routing, plugins. Recebe reports de bugs do tester e vulnerabilidades do security, e FAZ as correções.

**Frontend**: Implementa componentes React SSR, formulários admin, UI. Recebe reports de bugs de UI do tester e vulnerabilidades do security, e FAZ as correções.

**Tester**: Escreve e roda testes APENAS. NÃO edita código de implementação (só arquivos de teste). Se encontrar bug no código, reporta via SendMessage ao backend ou frontend E ao team-lead, e aguarda correção.

**Security**: APENAS revisa o trabalho dos demais. NÃO edita nenhum arquivo. Comunica ajustes necessários via SendMessage ao agente responsável (backend/frontend) E ao team-lead com detalhes da vulnerabilidade e sugestão de fix.

**DevOps**: Roda pipeline CI (fmt, lint, check, test, coverage). NÃO corrige código. Se encontrar falha, reporta ao agente responsável E ao team-lead via SendMessage.

### Comunicação obrigatória

Quando qualquer agente encontra um problema fora do seu escopo:
1. Envia SendMessage ao agente RESPONSÁVEL pela correção (backend/frontend)
2. Envia SendMessage ao TEAM-LEAD informando o problema
3. Aguarda a correção antes de continuar

O team-lead SEMPRE deve ser informado sobre problemas encontrados para manter visibilidade.

### Instrução obrigatória nos prompts dos agentes

Incluir nos prompts de TODOS os agentes:
```
REGRA DE OURO: Execute APENAS atividades do seu papel.
- NÃO edite arquivos fora do seu escopo.
- Se encontrar problemas em código que não é sua responsabilidade, envie
  SendMessage ao agente correto (backend/frontend) E ao team-lead descrevendo
  o problema. Aguarde a correção antes de continuar.
- O team-lead deve SEMPRE ser informado sobre problemas encontrados.
```

**Why:** Mantém o time produtivo e organizado. Evita conflitos de edição, garante qualidade (quem implementou conhece melhor o código), mantém rastreabilidade clara de quem fez o quê, e o team-lead tem visibilidade total do que acontece.

**How to apply:** Sempre incluir a regra de ouro no prompt de cada agente ao spawnar. Se o agente responsável já foi encerrado, o team lead deve spawnar um novo para a correção.

## 3. Modelos por papel

Modelos obrigatórios por papel do agente:

- **Backend** → `model: "sonnet"` (implementação, rápido)
- **Frontend** → `model: "sonnet"` (implementação, rápido)
- **Tester** → `model: "opus"` (qualidade, criterioso)
- **Security** → `model: "opus"` (auditoria, profundo)
- **DevOps** → `model: "haiku"` (CI/CD, tarefas operacionais leves)

**Why:** Agentes de implementação (backend/frontend) usam Sonnet (mais rápido e econômico). Agentes de qualidade (tester/security) usam Opus (mais criterioso e profundo na análise). DevOps usa Haiku (tarefas operacionais que não exigem raciocínio complexo).

**How to apply:**
- `Agent(name: "backend", model: "sonnet", ...)`
- `Agent(name: "frontend", model: "sonnet", ...)`
- `Agent(name: "tester", model: "opus", ...)`
- `Agent(name: "security", model: "opus", ...)`
- `Agent(name: "devops", model: "haiku", ...)`
- Outros agentes de implementação/código → sonnet
- Outros agentes de revisão/auditoria/QA → opus
- Outros agentes operacionais (CI, deploy, format) → haiku

## 4. TeamCreate obrigatório

Ao spawnar múltiplos agentes para uma tarefa, SEMPRE usar TeamCreate primeiro e depois spawnar cada agente com `team_name` no Agent tool. Não spawnar agentes individuais sem time.

**Why:** Leandro pediu explicitamente (2026-03-29) para usar "modo de time". Agentes individuais sem coordenação de time não atendem ao workflow esperado. O time permite task list compartilhada, comunicação entre agentes, e visibilidade de progresso.

**How to apply:**
1. `TeamCreate` com nome descritivo (ex: `fase6c-dnd-editor`)
2. `TaskCreate` para cada task no task list do time
3. `TaskUpdate` para configurar dependências (blockedBy)
4. `Agent` com `team_name`, `name`, modelo por papel (ver seção 3), `mode: "auto"`
5. Papéis típicos: backend (sonnet), frontend (sonnet), tester (opus), security (opus), devops (haiku)
6. Tester e security sempre aguardam conclusão das tasks de implementação
7. DevOps sempre é o último — aguarda tester e security

## 5. CI antes de merge/release

O agente DevOps DEVE monitorar o CI do GitHub Actions antes de aprovar merge e criar tags de release. CI local passando NÃO é suficiente.

**Why:** Na v0.8.0-alpha.1, o DevOps fez merge e criou tag sem esperar CI do GitHub. O CI da tag falhou (https://github.com/LeandrodaSilva/ten.net/actions/runs/23725568952), causando release quebrada.

**How to apply:**
1. Após push do PR: `gh pr checks <PR> --watch` — aguardar CI verde
2. Após merge para main: `gh run list --branch main --limit 1` — aguardar CI verde
3. Só criar tag APÓS CI verde no main: `git tag vX.Y.Z && git push --tags`
4. Após push da tag: `gh run list --limit 1` — monitorar CI da tag
5. Se qualquer CI falhar, reportar ao team-lead IMEDIATAMENTE com link do run
6. NUNCA prosseguir para próximo passo se CI anterior falhou
