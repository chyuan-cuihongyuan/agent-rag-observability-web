"use client";

// b-18（工单 1132）：web-vitals 上报挂载点（App Router 要求 client 组件承载 hook）
import { useReportWebVitals } from "next/web-vitals";
import { reportWebVitals } from "@/lib/web-vitals";

export function WebVitalsReporter() {
  useReportWebVitals(reportWebVitals);
  return null;
}
