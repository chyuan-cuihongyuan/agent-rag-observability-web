/**
 * 契约一致性断言（五期 AF4，工单 0240；Pact 消费者契约思想，对齐 Z5 先例）—
 * 断言一：web api.ts 的全部调用路径（contract-endpoints.json 快照）必须被后端端点
 * 前缀集合覆盖（模板变量置空 + `//` 归一后的前缀匹配口径）。
 * 断言二（负例自检）：注入假路径必须匹配失败——证明断言本身有效不空转。
 * 后端新增/删除控制器前缀时需同步更新 contract-endpoints.json 的 backendPrefixes 快照。
 */
import * as fs from 'fs';
import * as path from 'path';

const contract = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'contract-endpoints.json'), 'utf-8')
) as { webApiPaths: string[]; backendPrefixes: string[] };

/** 归一：模板变量置空后的路径压平 `//` → `/` */
function normalize(p: string): string {
  return p.replace(/\/{2,}/g, '/').replace(/\/$/, '') || '/';
}

/** 前缀覆盖判定：path === prefix 或 path 以 prefix + '/' 开头 */
function covered(webPath: string, prefixes: string[]): boolean {
  const normalized = normalize(webPath);
  return prefixes.some(
    (prefix) => normalized === prefix || normalized.startsWith(prefix + '/')
  );
}

describe('AF4 观测 web API 契约一致性（web ⊆ 后端端点清单）', () => {
  it('api.ts 全部调用路径均被后端前缀覆盖', () => {
    const uncovered = contract.webApiPaths.filter((p) => !covered(p, contract.backendPrefixes));
    expect(uncovered).toEqual([]);
  });

  it('后端前缀快照非空且无重复', () => {
    expect(contract.backendPrefixes.length).toBeGreaterThan(0);
    expect(new Set(contract.backendPrefixes).size).toBe(contract.backendPrefixes.length);
  });

  it('负例自检：假路径必须不被覆盖（防断言空转）', () => {
    expect(covered('/api/v1/__bogus_endpoint__', contract.backendPrefixes)).toBe(false);
    expect(covered('/admin/v1/__bogus__', contract.backendPrefixes)).toBe(false);
    // 归一口径自检：双斜杠路径与单斜杠等价
    expect(covered('/api/v1/eval//dataset', contract.backendPrefixes)).toBe(
      covered('/api/v1/eval/dataset', contract.backendPrefixes)
    );
  });
});
