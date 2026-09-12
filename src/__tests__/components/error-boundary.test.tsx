/**
 * error.tsx 组件测试（SELFLOOP2 loop-222，testing-library 栈首例）。
 * 锁定错误边界的外部行为：消息渲染/截断、digest 展示、reset 重试交互。
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorBoundary from "@/app/error";

function makeError(overrides: Partial<Error & { digest?: string }> = {}) {
  return Object.assign(new Error("渲染失败"), overrides) as Error & { digest?: string };
}

describe("error.tsx 错误边界组件", () => {
  it("渲染错误标题与消息摘要", () => {
    render(<ErrorBoundary error={makeError()} reset={jest.fn()} />);

    expect(screen.getByText("页面渲染出错")).toBeInTheDocument();
    expect(screen.getByText("渲染失败")).toBeInTheDocument();
  });

  it("超长消息截断至 200 字符", () => {
    const long = "错".repeat(500);
    render(<ErrorBoundary error={makeError({ message: long })} reset={jest.fn()} />);

    expect(screen.getByText(long.slice(0, 200))).toBeInTheDocument();
    expect(screen.queryByText(long)).not.toBeInTheDocument();
  });

  it("digest 存在时展示（排障关联）", () => {
    render(<ErrorBoundary error={makeError({ digest: "abc123" })} reset={jest.fn()} />);

    expect(screen.getByText(/digest: abc123/)).toBeInTheDocument();
  });

  it("点击重试触发 reset 回调", async () => {
    const reset = jest.fn();
    const user = userEvent.setup();
    render(<ErrorBoundary error={makeError()} reset={reset} />);

    await user.click(screen.getByRole("button", { name: "重试" }));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
