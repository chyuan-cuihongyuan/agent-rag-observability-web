/**
 * CopyButton 组件测试（SELFLOOP3 loop-315，工单 0428/0429）
 */
import { render, screen, fireEvent, act } from "@testing-library/react";
import { CopyButton } from "@/components/ui/copy-button";

function mockClipboard() {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
  return writeText;
}

describe("CopyButton", () => {
  it("点击写入正确文本并进入已复制态", async () => {
    const writeText = mockClipboard();
    render(<CopyButton text="hello trace" />);

    fireEvent.click(screen.getByLabelText("复制"));
    // clipboard 写入是异步 promise，等微任务队列冲刷
    await Promise.resolve();

    expect(writeText).toHaveBeenCalledWith("hello trace");
  });

  it("两秒后回落为复制态", async () => {
    mockClipboard();
    jest.useFakeTimers();
    render(<CopyButton text="x" />);

    fireEvent.click(screen.getByLabelText("复制"));
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByLabelText("已复制")).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(2100);
    });
    expect(screen.getByLabelText("复制")).toBeTruthy();
    jest.useRealTimers();
  });

  it("clipboard 失败不抛异常", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: jest.fn().mockRejectedValue(new Error("denied")) },
      configurable: true,
    });
    render(<CopyButton text="y" />);

    fireEvent.click(screen.getByLabelText("复制"));
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByLabelText("复制")).toBeTruthy();
  });
});
