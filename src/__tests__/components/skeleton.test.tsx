/**
 * 骨架组件渲染测试（SELFLOOP2 loop-231）：
 * loading.tsx 结构契约（aria-busy、卡片骨架×3、趋势骨架）+ Skeleton className 合并。
 */
import { render, screen } from "@testing-library/react";
import Loading from "@/app/loading";
import { Skeleton } from "@/components/ui/skeleton";

describe("loading.tsx 路由骨架", () => {
  it("容器标记 aria-busy 与加载标签", () => {
    render(<Loading />);
    expect(screen.getByLabelText("加载中")).toHaveAttribute("aria-busy", "true");
  });

  it("渲染 3 张卡片骨架 + 1 张趋势骨架（animate-pulse 块）", () => {
    const { container } = render(<Loading />);
    const pulses = container.querySelectorAll(".animate-pulse");
    // 3 卡片 × 3 块 + 趋势 2 块 = 11
    expect(pulses.length).toBeGreaterThanOrEqual(11);
  });
});

describe("Skeleton 组件", () => {
  it("合并自定义 className 并保留基础类", () => {
    const { container } = render(<Skeleton className="h-8 w-16 extra-class" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain("animate-pulse");
    expect(el.className).toContain("bg-muted");
    expect(el.className).toContain("h-8");
    expect(el.className).toContain("extra-class");
    expect(el).toHaveAttribute("aria-hidden", "true");
  });
});
