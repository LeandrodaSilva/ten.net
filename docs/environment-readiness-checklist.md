# Environment Readiness Checklist

## Purpose
Verify every new engineer can securely build, test, review, and deploy changes without hidden setup debt.

## Usage
- Complete this checklist before Day 1 where possible.
- Re-verify after any platform or toolchain migration.

## Identity and Access
- [ ] SSO account active.
- [ ] MFA enabled.
- [ ] Source control access granted (read/write).
- [ ] Required repositories visible.
- [ ] CI/CD platform access granted.
- [ ] Cloud provider console/CLI access granted.
- [ ] Secrets manager access granted.
- [ ] Incident management/on-call tooling access granted.
- [ ] Internal docs and communication channels joined.

## Workstation and Toolchain
- [ ] Approved OS version and security baseline applied.
- [ ] Package manager installed and updated.
- [ ] Language/runtime versions installed per project requirements.
- [ ] Container tooling installed (if required).
- [ ] Editor/IDE configured with required extensions.
- [ ] Git config, commit signing, and SSH keys configured.

## Repository Bootstrap
- [ ] Repository cloned successfully.
- [ ] Dependency installation completed.
- [ ] Local environment variables created from template.
- [ ] Pre-commit hooks installed.
- [ ] App/service starts locally.
- [ ] Test suite smoke subset passes locally.
- [ ] Lint/format checks pass locally.

## Delivery Workflow
- [ ] Can create branch and push changes.
- [ ] Can open PR with template fields completed.
- [ ] Can trigger CI checks and inspect logs.
- [ ] Can request and respond to review comments.
- [ ] Understand merge requirements and release gates.

## Runtime and Operations
- [ ] Access to logs/metrics/traces confirmed.
- [ ] Can locate runbooks for primary services.
- [ ] Can follow rollback path for one non-production deployment.
- [ ] Understand incident severity levels and escalation contacts.

## Security and Compliance
- [ ] Secret handling policy acknowledged.
- [ ] Dependency/license policy acknowledged.
- [ ] Data handling requirements reviewed.
- [ ] Device protection controls verified.

## Sign-off
- Engineer: ____________________ Date: __________
- Buddy: ______________________ Date: __________
- CTO/Hiring Manager: __________ Date: __________

## Blockers
Record unresolved blockers with owner and ETA.
- Blocker:
- Owner:
- Action:
- ETA:
