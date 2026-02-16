---
summary: "CLI reference for `openclaw security` (audit and fix common security footguns)"
read_when:
  - You want to run a quick security audit on config/state
  - You want to apply safe “fix” suggestions (chmod, tighten defaults)
title: "security"
---

# `openclaw security`

Security tools (audit + optional fixes).

Related:

- Security guide: [Security](/gateway/security)

## Audit

```bash
openclaw security audit
openclaw security audit --deep
openclaw security audit --fix
```

The audit warns when multiple DM senders share the main session and recommends **secure DM mode**: `session.dmScope="per-channel-peer"` (or `per-account-channel-peer` for multi-account channels) for shared inboxes.
It also warns when small models (`<=300B`) are used without sandboxing and with web/browser tools enabled.
For webhook ingress, it warns when `hooks.defaultSessionKey` is unset, when request `sessionKey` overrides are enabled, and when overrides are enabled without `hooks.allowedSessionKeyPrefixes`.
It also warns when sandbox Docker settings are configured while sandbox mode is off, when `gateway.nodes.denyCommands` uses ineffective pattern-like/unknown entries, when global `tools.profile="minimal"` is overridden by agent tool profiles, and when installed extension plugin tools may be reachable under permissive tool policy.

## Skill security

Community skills (installed from ClawHub) are subject to additional security enforcement:

- **SKILL.md scanning**: content is scanned for prompt injection patterns, capability inflation, and boundary spoofing before entering the system prompt. Skills with critical findings are blocked from loading.
- **Capability enforcement**: community skills must declare `capabilities` (e.g., `shell`, `network`) in frontmatter. Undeclared dangerous tool usage is blocked at runtime.
- **Command dispatch gating**: community skills using `command-dispatch: tool` can't dispatch to dangerous tools without the matching capability.
- **Audit logging**: all security events are tagged with `category: "security"` and include session context for forensics. View in the web UI Logs tab using the Security filter.

See `openclaw skills check` for a runtime security overview and `openclaw skills info <name>` for per-skill security details.
