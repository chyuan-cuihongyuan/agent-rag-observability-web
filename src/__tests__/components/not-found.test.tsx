/**
 * not-found.tsx 渲染测试（SELFLOOP2 loop-239）。
 */
import { render, screen } from "@testing-library/react";
import NotFound from "@/app/not-found";

describe("not-found 404 页", () => {
  it("展示 404 主视觉与资源不存在文案", () => {
    render(<NotFound />);
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByText("资源不存在")).toBeInTheDocument();
  });

  it("提供返回首页链接", () => {
    render(<NotFound />);
    const link = screen.getByRole("link", { name: "返回首页" });
    expect(link).toHaveAttribute("href", "/");
  });
});
