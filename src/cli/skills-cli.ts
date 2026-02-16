import type { Command } from "commander";
import type { SkillStatusReport } from "../agents/skills-status.js";
import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from "../agents/agent-scope.js";
import { loadConfig } from "../config/config.js";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { loggingState } from "../logging/state.js";
import { defaultRuntime } from "../runtime.js";
import { formatDocsLink } from "../terminal/links.js";
import { theme } from "../terminal/theme.js";
import { formatSkillInfo, formatSkillsCheck, formatSkillsList } from "./skills-cli.format.js";

export type {
  SkillInfoOptions,
  SkillsCheckOptions,
  SkillsListOptions,
} from "./skills-cli.format.js";
export { formatSkillInfo, formatSkillsCheck, formatSkillsList } from "./skills-cli.format.js";

const log = createSubsystemLogger("skills/cli");

/** Build a structured summary of the skills report for JSON file logging. */
function buildStructuredReport(report: SkillStatusReport) {
  const eligible = report.skills.filter((s) => s.eligible);
  const blocked = report.skills.filter((s) => s.scanResult?.severity === "critical");
  const disabled = report.skills.filter((s) => s.disabled);
  return {
    total: report.skills.length,
    eligible: eligible.length,
    blocked: blocked.length,
    disabled: disabled.length,
    missing: report.skills.length - eligible.length - blocked.length - disabled.length,
    skills: report.skills.map((s) => ({
      name: s.name,
      source: s.source,
      eligible: s.eligible,
      scanSeverity: s.scanResult?.severity ?? "clean",
      capabilities: s.capabilities,
    })),
  };
}

/**
 * Log the formatted output to console and structured JSON to the file logger.
 * Console gets the pretty table; file log gets machine-readable JSON.
 */
function logSkillsOutput(formatted: string, report: SkillStatusReport, command: string) {
  // Write pretty table to console only (bypass file logger interception)
  const rawLog = loggingState.rawConsole?.log ?? defaultRuntime.log;
  rawLog(formatted);
  // Write structured JSON to the file logger
  log.info(`${command} completed`, {
    command,
    ...buildStructuredReport(report),
  });
}

/**
 * Register the skills CLI commands
 */
export function registerSkillsCli(program: Command) {
  const skills = program
    .command("skills")
    .description("List and inspect available skills")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/skills", "docs.openclaw.ai/cli/skills")}\n`,
    );

  skills
    .command("list")
    .description("List all available skills")
    .option("--json", "Output as JSON", false)
    .option("--eligible", "Show only eligible (ready to use) skills", false)
    .option("-v, --verbose", "Show more details including missing requirements", false)
    .action(async (opts) => {
      try {
        const config = loadConfig();
        const workspaceDir = resolveAgentWorkspaceDir(config, resolveDefaultAgentId(config));
        const { buildWorkspaceSkillStatus } = await import("../agents/skills-status.js");
        const report = buildWorkspaceSkillStatus(workspaceDir, { config });
        logSkillsOutput(formatSkillsList(report, opts), report, "skills list");
      } catch (err) {
        defaultRuntime.error(String(err));
        defaultRuntime.exit(1);
      }
    });

  skills
    .command("info")
    .description("Show detailed information about a skill")
    .argument("<name>", "Skill name")
    .option("--json", "Output as JSON", false)
    .action(async (name, opts) => {
      try {
        const config = loadConfig();
        const workspaceDir = resolveAgentWorkspaceDir(config, resolveDefaultAgentId(config));
        const { buildWorkspaceSkillStatus } = await import("../agents/skills-status.js");
        const report = buildWorkspaceSkillStatus(workspaceDir, { config });
        logSkillsOutput(formatSkillInfo(report, name, opts), report, `skills info ${name}`);
      } catch (err) {
        defaultRuntime.error(String(err));
        defaultRuntime.exit(1);
      }
    });

  skills
    .command("check")
    .description("Check which skills are ready vs missing requirements")
    .option("--json", "Output as JSON", false)
    .action(async (opts) => {
      try {
        const config = loadConfig();
        const workspaceDir = resolveAgentWorkspaceDir(config, resolveDefaultAgentId(config));
        const { buildWorkspaceSkillStatus } = await import("../agents/skills-status.js");
        const report = buildWorkspaceSkillStatus(workspaceDir, { config });
        logSkillsOutput(formatSkillsCheck(report, opts), report, "skills check");
      } catch (err) {
        defaultRuntime.error(String(err));
        defaultRuntime.exit(1);
      }
    });

  // Default action (no subcommand) - show list
  skills.action(async () => {
    try {
      const config = loadConfig();
      const workspaceDir = resolveAgentWorkspaceDir(config, resolveDefaultAgentId(config));
      const { buildWorkspaceSkillStatus } = await import("../agents/skills-status.js");
      const report = buildWorkspaceSkillStatus(workspaceDir, { config });
      logSkillsOutput(formatSkillsList(report, {}), report, "skills list");
    } catch (err) {
      defaultRuntime.error(String(err));
      defaultRuntime.exit(1);
    }
  });
}
