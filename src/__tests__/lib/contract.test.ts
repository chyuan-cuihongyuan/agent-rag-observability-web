/**
 * API 契约一致性校验测试（工单 0188 Z5）
 *
 * 规则：前端 api.ts 中封装的每个 `/api/v1/...` 路径，必须被后端端点契约清单
 * （父仓 docs/02-agent-rag-observability-server/20-后端端点契约清单.md）覆盖；
 * 后端清单允许多于前端（容忍后端先行）。路径参数归一为 {*} 后按段前缀匹配。
 */
import fs from "fs";
import path from "path";

const API_TS = path.resolve(__dirname, "../../lib/api.ts");
const MANIFEST_MD = path.resolve(
  __dirname,
  "../../../../docs/02-agent-rag-observability-server/20-后端端点契约清单.md"
);

/** 从 api.ts 源码提取前端封装路径（模板字符串形态），${...} 归一为 {*}；截断在未闭合 ${ 处 */
export function extractFrontendPaths(source: string): string[] {
  const found = new Set<string>();
  const re = /\/api\/v1[A-Za-z0-9\-_/.$ {}]*/g;
  for (const m of source.matchAll(re)) {
    let p = m[0].replace(/\$\{[^}]*\}/g, "{*}"); // 完整表达式归一
    const unclosed = p.indexOf("/${");
    if (unclosed >= 0) p = p.slice(0, unclosed); // 未闭合（如三元表达式）截断
    p = p.replace(/\/+$/, "") || "/api/v1";
    found.add(p);
  }
  return [...found].sort();
}

/**
 * 已审核的动态拼接路径展开表：键=归一化后的前端模式，值=其运行时可能展开的后端清单模式。
 * 例：freeze/unfreeze 由三元表达式拼接（0186 前端同款）。
 */
export const DYNAMIC_EXPANSIONS: Record<string, string[]> = {
  "/api/v1/eval/dataset/{*}": [
    "/api/v1/eval/dataset/{*}/freeze",
    "/api/v1/eval/dataset/{*}/unfreeze",
  ],
};

/** 从清单 markdown 提取后端路径（{xxx} 归一为 {*}） */
export function extractManifestPaths(manifest: string): string[] {
  const found = new Set<string>();
  for (const m of manifest.matchAll(/`[A-Z,]+ (\/api\/v1[^`]+)`/g)) {
    found.add(m[1].replace(/\{[^}]*\}/g, "{*}"));
  }
  return [...found].sort();
}

/** 段前缀匹配：前端路径是否被某条后端模式覆盖 */
export function isCovered(frontendPath: string, backendPatterns: string[]): boolean {
  const f = frontendPath.split("/");
  return backendPatterns.some((p) => {
    const b = p.split("/");
    if (b.length !== f.length) return false;
    return b.every((seg, i) => seg === "{*}" || seg === f[i]);
  });
}

/** 主断言 helper：返回未被清单覆盖的前端路径（空=通过） */
export function uncoveredPaths(frontendPaths: string[], manifest: string): string[] {
  const patterns = extractManifestPaths(manifest);
  return frontendPaths.filter((p) => {
    if (isCovered(p, patterns)) {
      return false; // 已覆盖，不进缺失清单
    }
    const expansions = DYNAMIC_EXPANSIONS[p];
    return !(expansions && expansions.every((e) => isCovered(e, patterns)));
  });
}

describe("API 契约一致性（0188 Z5）", () => {
  const source = fs.readFileSync(API_TS, "utf-8");
  const manifest = fs.readFileSync(MANIFEST_MD, "utf-8");

  it("api.ts 应能提取出足量路径（扫描器有效性哨兵）", () => {
    const paths = extractFrontendPaths(source);
    expect(paths.length).toBeGreaterThanOrEqual(30);
    expect(paths.some((p) => p.startsWith("/api/v1/eval"))).toBe(true);
  });

  it("清单应能提取出足量后端模式", () => {
    const patterns = extractManifestPaths(manifest);
    expect(patterns.length).toBeGreaterThanOrEqual(80);
  });

  it("前端封装的每个路径都应被后端清单覆盖", () => {
    const missing = uncoveredPaths(extractFrontendPaths(source), manifest);
    expect(missing).toEqual([]);
  });

  it("负例自检 — 归一匹配器能识别清单外路径", () => {
    const patterns = extractManifestPaths(manifest);
    expect(isCovered("/api/v1/eval/task/{*}", patterns)).toBe(true);
    expect(isCovered("/api/v1/not-exist/{*}", patterns)).toBe(false);
    expect(uncoveredPaths(["/api/v1/not-exist"], manifest)).toEqual(["/api/v1/not-exist"]);
  });
});
