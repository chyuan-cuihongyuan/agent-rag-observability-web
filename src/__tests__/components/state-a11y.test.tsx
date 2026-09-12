/**
 * AUTOLOOP al-25 / 工单 1025：状态组件 a11y 冒烟（借鉴 dequelabs/axe-core）。
 *
 * 借鉴 axe-core 思想：可访问性是可测试属性，组件级冒烟先于全页审计。
 * 覆盖三状态组件（track loop-07 产物）的 WCAG 基线规则。
 */

import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";

import { EmptyState } from "@/components/state/empty-state";
import { ErrorState } from "@/components/state/error-state";
import { LoadingState } from "@/components/state/loading-state";

expect.extend(toHaveNoViolations);

describe("状态组件 a11y 冒烟", () => {
  it("EmptyState 无可访问性违规", async () => {
    const { container } = render(
      <EmptyState text="暂无数据" description="试试调整查询条件" />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("ErrorState 无可访问性违规（含重试按钮）", async () => {
    const { container } = render(
      <ErrorState message="加载失败" onRetry={() => undefined} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("LoadingState 无可访问性违规", async () => {
    const { container } = render(<LoadingState text="加载中" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
