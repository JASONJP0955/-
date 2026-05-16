import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

const forbiddenEnvFiles = /(^|\/)\.env($|\.)(?!example$)/;
const secretPatterns = [
  {
    name: "OpenAI API key",
    pattern: /sk-(?:proj-|svcacct-|admin-|user-)?[A-Za-z0-9_-]{20,}/g
  },
  {
    name: "Google API key",
    pattern: /AIza[0-9A-Za-z_-]{20,}/g
  }
];

function git(args) {
  return execFileSync(resolveGit(), args, {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024
  }).trim();
}

function resolveGit() {
  const candidates = [
    process.env.GIT_BINARY,
    "git",
    "C:\\Program Files\\Git\\cmd\\git.exe",
    "C:\\Program Files\\Microsoft Visual Studio\\2022\\Community\\Common7\\IDE\\CommonExtensions\\Microsoft\\TeamFoundation\\Team Explorer\\Git\\cmd\\git.exe"
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      if (candidate !== "git" && !existsSync(candidate)) continue;
      execFileSync(candidate, ["--version"], { stdio: "ignore" });
      return candidate;
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error("Git executable was not found. Install Git or set GIT_BINARY.");
}

const stagedFiles = git(["diff", "--cached", "--name-only", "--diff-filter=ACMR"])
  .split(/\r?\n/)
  .filter(Boolean)
  .map((file) => file.replaceAll("\\", "/"));

const problems = [];

for (const file of stagedFiles) {
  if (forbiddenEnvFiles.test(file)) {
    problems.push(`${file}: environment files must not be committed`);
    continue;
  }

  let content = "";
  try {
    content = git(["show", `:${file}`]);
  } catch {
    continue;
  }

  for (const { name, pattern } of secretPatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) {
      problems.push(`${file}: possible ${name}`);
    }
  }
}

if (problems.length) {
  console.error("Secret check failed:");
  for (const problem of problems) {
    console.error(`- ${problem}`);
  }
  console.error("Remove secrets from staged files before committing.");
  process.exit(1);
}

console.log("Secret check passed.");
