/**
 * 长文本截断（SELFLOOP3 loop-328，工单 0454/0455）
 *
 * null/undefined → "-"；短于阈值直通；超长截断加 "..."。
 */
export function truncate(text: string | undefined | null, maxLen: number): string {
  if (text === null || text === undefined) {
    return "-";
  }
  if (text.length <= maxLen) {
    return text;
  }
  return text.slice(0, maxLen) + "...";
}
