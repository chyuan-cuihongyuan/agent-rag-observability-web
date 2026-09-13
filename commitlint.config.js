// b-16（工单 1128）：commit-msg 门禁——与 al-23 PR 标题门禁同口径
// type ∈ feat|fix|docs|chore|test|refactor|perf|build|security
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [2, "always", ["feat", "fix", "docs", "chore", "test", "refactor", "perf", "build", "security"]],
  },
};
