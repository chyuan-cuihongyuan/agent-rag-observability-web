/**
 * 耗时格式化 — 分级人类可读（工单 0406/0407，SELFLOOP3 loop-304）
 *
 * 分级（T1 决议）：
 * - null/undefined/NaN/负数 → "—"
 * - <1ms → "<1ms"
 * - <1s → 整数毫秒（"87ms"）
 * - <60s → 两位小数秒（"1.23s"，floor 截断防跨级进位）
 * - <1h → "Xm YYs"
 * - ≥1h → "Xh YYm"
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || Number.isNaN(ms) || ms < 0) {
    return "—";
  }
  if (ms < 1) {
    return "<1ms";
  }
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  if (ms < 60_000) {
    // floor 截断而非四舍五入：59999ms 显示 "59.99s" 而非跨级进位的 "60.00s"
    return `${(Math.floor(ms / 10) / 100).toFixed(2)}s`;
  }
  if (ms < 3_600_000) {
    const m = Math.floor(ms / 60_000);
    const s = Math.floor((ms % 60_000) / 1000);
    return `${m}m ${String(s).padStart(2, "0")}s`;
  }
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}
