// b-18（工单 1132）：web-vitals 采集——环境变量开关式（默认关，零默认开销）
// 上报目标：NEXT_PUBLIC_WEB_VITALS_ENDPOINT（缺省 console.debug）

// 官方 Metric 结构的本地最小类型（next/web-vitals 编译产物内部类型不直接引）
interface WebVitalMetric {
  name: string;
  value: number;
  rating?: string;
  id: string;
}

export function reportWebVitals(metric: WebVitalMetric): void {
  report(metric, isEnabled(), endpoint());
}

const isEnabled = () => process.env.NEXT_PUBLIC_WEB_VITALS_ENABLED === "true";
const endpoint = () => process.env.NEXT_PUBLIC_WEB_VITALS_ENDPOINT;

/** 分支逻辑纯函数（供单测直测；Next 对 NEXT_PUBLIC_* 的构建期内联使
 *  运行时注入在 jest 下不可靠，故开关判定与上报行为解耦） */
export function report(
  metric: WebVitalMetric,
  isEnabledFlag: boolean,
  target?: string,
): void {
  if (!isEnabledFlag) return;
  const payload = JSON.stringify({
    name: metric.name,
    value: metric.value,
    id: metric.id,
    path: typeof location === "undefined" ? "-" : location.pathname,
  });
  if (target && typeof navigator.sendBeacon === "function") {
    navigator.sendBeacon(target, payload);
    return;
  }
  if (target) {
    void fetch(target, { method: "POST", body: payload, keepalive: true });
    return;
  }
  // 无 endpoint：开发态直接可见
  console.debug("[web-vitals]", payload);
}
