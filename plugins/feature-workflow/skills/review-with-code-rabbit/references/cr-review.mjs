#!/usr/bin/env node

/**
 * cr-review.mjs — Cross-platform CodeRabbit review helper
 *
 * Works on Windows, macOS, and Linux.
 * - If CodeRabbit CLI is available → uses it
 * - If not → collects git diff and outputs structured data for Claude to review
 *
 * Usage:
 *   node cr-review.mjs [--type <all|committed|uncommitted>] [--base-commit <hash>] [--api-key <key>]
 *
 * Environment:
 *   CODERABBIT_API_KEY — API key for CodeRabbit CLI authentication
 */

import { execSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { platform } from "node:os";

// ─── Argument Parsing ───────────────────────────────────────────────

function parseArgs(argv) {
  const args = {
    type: null,       // all | committed | uncommitted | auto
    baseCommit: null, // specific commit hash
    apiKey: process.env.CODERABBIT_API_KEY || null,
    cwd: process.cwd(),
  };
  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case "--type":
      case "-t":
        args.type = argv[++i];
        break;
      case "--base-commit":
        args.baseCommit = argv[++i];
        break;
      case "--api-key":
        args.apiKey = argv[++i];
        break;
      case "--cwd":
        args.cwd = argv[++i];
        break;
    }
  }
  return args;
}

// ─── Git Helpers ────────────────────────────────────────────────────

function git(cmd, cwd) {
  try {
    return execSync(`git ${cmd}`, { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch {
    return null;
  }
}

function isGitRepo(cwd) {
  return git("rev-parse --is-inside-work-tree", cwd) === "true";
}

function hasCommits(cwd) {
  return git("rev-parse HEAD", cwd) !== null;
}

function getUncommittedChanges(cwd) {
  const status = git("status --porcelain", cwd);
  return status ? status.split("\n").filter(Boolean) : [];
}

function getUnpushedCommits(cwd) {
  const upstream = git("rev-parse --abbrev-ref @{u}", cwd);
  if (!upstream) return null; // no upstream set
  const log = git("log @{u}..HEAD --oneline", cwd);
  return log ? log.split("\n").filter(Boolean) : [];
}

function getCommitsSince(hash, cwd) {
  const log = git(`log ${hash}..HEAD --oneline`, cwd);
  return log ? log.split("\n").filter(Boolean) : [];
}

function getDiff(type, baseCommit, cwd) {
  switch (type) {
    case "uncommitted":
      // staged + unstaged
      return {
        diff: git("diff HEAD", cwd) || git("diff", cwd) || "",
        stat: git("diff HEAD --stat", cwd) || git("diff --stat", cwd) || "",
        files: git("diff HEAD --name-only", cwd) || git("diff --name-only", cwd) || "",
      };
    case "committed":
      if (baseCommit) {
        return {
          diff: git(`diff ${baseCommit}..HEAD`, cwd) || "",
          stat: git(`diff ${baseCommit}..HEAD --stat`, cwd) || "",
          files: git(`diff ${baseCommit}..HEAD --name-only`, cwd) || "",
        };
      }
      // committed but unpushed
      return {
        diff: git("diff @{u}..HEAD", cwd) || "",
        stat: git("diff @{u}..HEAD --stat", cwd) || "",
        files: git("diff @{u}..HEAD --name-only", cwd) || "",
      };
    case "all":
    default: {
      // all changes: committed unpushed + uncommitted
      const base = baseCommit || git("rev-parse @{u}", cwd) || git("rev-parse HEAD~5", cwd) || "";
      if (!base) {
        return {
          diff: git("diff HEAD", cwd) || "",
          stat: git("diff HEAD --stat", cwd) || "",
          files: git("diff HEAD --name-only", cwd) || "",
        };
      }
      return {
        diff: git(`diff ${base}`, cwd) || "",
        stat: git(`diff ${base} --stat`, cwd) || "",
        files: git(`diff ${base} --name-only`, cwd) || "",
      };
    }
  }
}

// ─── CodeRabbit CLI Detection ───────────────────────────────────────

function findCrCli() {
  const commands = ["cr", "coderabbit"];
  for (const cmd of commands) {
    try {
      const version = execSync(`${cmd} --version`, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
      return { cmd, version };
    } catch {
      // not found
    }
  }
  // try npx as last resort
  try {
    const version = execSync("npx @coderabbitai/cli --version", { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"], timeout: 30000 }).trim();
    return { cmd: "npx @coderabbitai/cli", version };
  } catch {
    return null;
  }
}

function runCrReview(cli, args) {
  const cmdParts = [cli.cmd, "review", "--plain"];
  if (args.type && args.type !== "auto") cmdParts.push("-t", args.type);
  if (args.baseCommit) cmdParts.push("--base-commit", args.baseCommit);
  if (args.apiKey) cmdParts.push("--api-key", args.apiKey);

  // pass CLAUDE.md for context if it exists
  const claudeMd = join(args.cwd, "CLAUDE.md");
  if (existsSync(claudeMd)) cmdParts.push("-c", "CLAUDE.md");

  const command = cmdParts.join(" ");
  try {
    const output = execSync(command, { cwd: args.cwd, encoding: "utf-8", timeout: 120000, stdio: ["pipe", "pipe", "pipe"] });
    return { success: true, output };
  } catch (err) {
    return { success: false, output: err.stderr || err.message };
  }
}

// ─── Tracking File ──────────────────────────────────────────────────

const TRACKING_FILE = ".product/coderabbit-reviews.md";

function readTrackingFile(cwd) {
  const filePath = join(cwd, TRACKING_FILE);
  if (!existsSync(filePath)) return null;
  try {
    return readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

function getLastReviewedCommit(cwd) {
  const content = readTrackingFile(cwd);
  if (!content) return null;
  const match = content.match(/\*\*Last Reviewed Commit:\*\*\s*`?([a-f0-9]+)`?/);
  return match ? match[1] : null;
}

function updateTrackingFile(cwd, { commitHash, scope, filesCount, reviewMethod, hasIssues, summary }) {
  const productDir = join(cwd, ".product");
  if (!existsSync(productDir)) mkdirSync(productDir, { recursive: true });

  const filePath = join(cwd, TRACKING_FILE);
  const now = new Date().toISOString().replace("T", " ").slice(0, 16);
  const status = hasIssues ? "⚠️ Issues Found" : "✅ Clean";

  const newEntry = `### ${now} — Review
**Scope:** ${scope}
**Method:** ${reviewMethod}
**Files Reviewed:** ${filesCount}
**Status:** ${status}
**Summary:** ${summary}
**Commit at time of review:** \`${commitHash}\`
`;

  let existing = readTrackingFile(cwd);
  if (!existing) {
    // create new file
    const content = `# CodeRabbit Review Log

## Last Review State
- **Last Reviewed Commit:** \`${commitHash}\`
- **Timestamp:** ${now}
- **Files Reviewed:** ${filesCount}
- **Review Scope:** ${scope}
- **Review Method:** ${reviewMethod}
- **Status:** ${status}

## Review History

${newEntry}`;
    writeFileSync(filePath, content, "utf-8");
  } else {
    // update Last Review State
    existing = existing.replace(
      /## Last Review State[\s\S]*?(?=## Review History)/,
      `## Last Review State
- **Last Reviewed Commit:** \`${commitHash}\`
- **Timestamp:** ${now}
- **Files Reviewed:** ${filesCount}
- **Review Scope:** ${scope}
- **Review Method:** ${reviewMethod}
- **Status:** ${status}

`
    );
    // prepend to Review History
    existing = existing.replace(
      "## Review History\n",
      `## Review History\n\n${newEntry}`
    );
    writeFileSync(filePath, existing, "utf-8");
  }
}

// ─── Smart Scope Detection ──────────────────────────────────────────

function detectScope(args) {
  const cwd = args.cwd;

  if (args.type && args.type !== "auto") {
    return { type: args.type, description: `${args.type} changes (user-specified)` };
  }

  // Priority 1: Uncommitted changes
  const uncommitted = getUncommittedChanges(cwd);
  const unpushed = getUnpushedCommits(cwd);

  // Priority: if both uncommitted AND unpushed → review all
  if (uncommitted.length > 0 && unpushed && unpushed.length > 0) {
    return { type: "all", description: `All changes (${uncommitted.length} uncommitted files + ${unpushed.length} unpushed commits)` };
  }

  // Priority 1: Uncommitted only
  if (uncommitted.length > 0) {
    return { type: "uncommitted", description: `Uncommitted changes (${uncommitted.length} files)` };
  }

  // Priority 2: Committed but unpushed
  if (unpushed && unpushed.length > 0) {
    return { type: "committed", description: `Unpushed commits (${unpushed.length} commits)` };
  }

  // Priority 3: Since last review
  const lastReviewed = getLastReviewedCommit(cwd);
  if (lastReviewed) {
    const newCommits = getCommitsSince(lastReviewed, cwd);
    if (newCommits.length > 0) {
      args.baseCommit = lastReviewed;
      return { type: "committed", description: `Changes since last review (${newCommits.length} new commits since ${lastReviewed.slice(0, 7)})` };
    }
  }

  return { type: "none", description: "No new changes to review" };
}

// ─── Main ───────────────────────────────────────────────────────────

function main() {
  const args = parseArgs(process.argv);
  const os = platform();

  console.log(JSON.stringify({ phase: "init", os, cwd: args.cwd }));

  // Check: git repo
  if (!isGitRepo(args.cwd)) {
    console.log(JSON.stringify({ phase: "error", code: "NOT_GIT_REPO", message: "Not a git repository. Run 'git init' first." }));
    process.exit(1);
  }

  // Check: has commits
  if (!hasCommits(args.cwd)) {
    console.log(JSON.stringify({ phase: "error", code: "NO_COMMITS", message: "No commits yet. Make your first commit before running a review." }));
    process.exit(1);
  }

  // Detect scope
  const scope = detectScope(args);
  console.log(JSON.stringify({ phase: "scope", ...scope }));

  if (scope.type === "none") {
    console.log(JSON.stringify({ phase: "done", message: "No new changes to review." }));
    process.exit(0);
  }

  // Detect CodeRabbit CLI
  const cli = findCrCli();
  console.log(JSON.stringify({ phase: "cli_check", available: !!cli, version: cli?.version || null, os }));

  const commitHash = git("rev-parse HEAD", args.cwd) || "unknown";

  if (cli) {
    // ── Path A: Use CodeRabbit CLI ──
    console.log(JSON.stringify({ phase: "review_start", method: "coderabbit-cli", command: cli.cmd }));
    const result = runCrReview(cli, { ...args, type: scope.type });

    if (result.success) {
      console.log(JSON.stringify({ phase: "review_result", method: "coderabbit-cli", output: result.output }));

      // Update tracking
      const filesCount = (getDiff(scope.type, args.baseCommit, args.cwd).files || "").split("\n").filter(Boolean).length;
      updateTrackingFile(args.cwd, {
        commitHash,
        scope: scope.description,
        filesCount,
        reviewMethod: `CodeRabbit CLI (${cli.version})`,
        hasIssues: result.output.toLowerCase().includes("issue") || result.output.toLowerCase().includes("warning") || result.output.toLowerCase().includes("error"),
        summary: "See review output above",
      });
      console.log(JSON.stringify({ phase: "tracking_updated" }));
    } else {
      console.log(JSON.stringify({ phase: "cli_failed", error: result.output }));
      // Fall through to Path B
      outputDiffForClaude(args, scope, commitHash);
    }
  } else {
    // ── Path B: No CLI → output diff for Claude review ──
    outputDiffForClaude(args, scope, commitHash);
  }
}

function outputDiffForClaude(args, scope, commitHash) {
  console.log(JSON.stringify({ phase: "review_start", method: "claude-direct" }));

  const diffData = getDiff(scope.type, args.baseCommit, args.cwd);
  const filesList = diffData.files.split("\n").filter(Boolean);

  // Get recent commit messages for context
  const recentLog = git("log --oneline -10", args.cwd) || "";

  // Get project info for context
  const claudeMd = join(args.cwd, "CLAUDE.md");
  let projectContext = "";
  if (existsSync(claudeMd)) {
    try {
      projectContext = readFileSync(claudeMd, "utf-8").slice(0, 2000);
    } catch { /* ignore */ }
  }

  console.log(JSON.stringify({
    phase: "review_data",
    method: "claude-direct",
    scope: scope.description,
    filesCount: filesList.length,
    files: filesList,
    stat: diffData.stat,
    diff: diffData.diff,
    recentLog,
    projectContext: projectContext ? "(loaded)" : "(none)",
    commitHash,
  }));

  // Update tracking (mark as pending Claude review)
  updateTrackingFile(args.cwd, {
    commitHash,
    scope: scope.description,
    filesCount: filesList.length,
    reviewMethod: "Claude Direct Review (CodeRabbit CLI not available)",
    hasIssues: false, // Claude will determine this
    summary: "Pending Claude analysis",
  });

  console.log(JSON.stringify({ phase: "tracking_updated" }));
}

main();
