/**
 * useAsyncData 通用异步数据 hook 契约测试（工单 1141）：
 * 加载/成功/失败/重取状态机 + 竞态防护（过期响应不覆盖新状态）。
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { useAsyncData } from "@/lib/use-async-data";

describe("useAsyncData 状态机", () => {
  it("初始为 loading，成功后写入 data 并关闭 loading", async () => {
    const { result } = renderHook(() => useAsyncData(async () => "payload", [], "init"));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBe("init");

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toBe("payload");
    expect(result.current.error).toBeNull();
  });

  it("loader 抛 Error 时写入 error", async () => {
    const { result } = renderHook(() =>
      useAsyncData(async () => {
        throw new Error("boom");
      }, [])
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("boom");
    expect(result.current.data).toBeUndefined();
  });

  it("非 Error 抛出物被包装为 Error", async () => {
    const { result } = renderHook(() =>
      useAsyncData(async () => {
        throw "plain-string-failure";
      }, [])
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error?.message).toBe("plain-string-failure");
  });

  it("reload 重新触发加载并刷新数据", async () => {
    let value = 1;
    const { result } = renderHook(() => useAsyncData(async () => value, []));

    await waitFor(() => expect(result.current.data).toBe(1));

    value = 2;
    act(() => {
      result.current.reload();
    });

    await waitFor(() => expect(result.current.data).toBe(2));
    expect(result.current.error).toBeNull();
  });

  it("deps 变化自动重载", async () => {
    let value = "a";
    const loader = jest.fn(async () => value);
    const { rerender } = renderHook(({ key }) => useAsyncData(loader, [key]), {
      initialProps: { key: 1 },
    });

    await waitFor(() => expect(loader).toHaveBeenCalledTimes(1));

    value = "b";
    rerender({ key: 2 });

    await waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
  });

  it("竞态防护：慢的过期响应不覆盖更快的新响应", async () => {
    let resolveSlow: (v: string) => void = () => {};
    const slow = new Promise<string>((resolve) => {
      resolveSlow = resolve;
    });
    const loader = jest.fn((key: string) =>
      key === "slow" ? slow : Promise.resolve("fast-result")
    );
    const { rerender, result } = renderHook(({ key }) => useAsyncData(() => loader(key), [key]), {
      initialProps: { key: "slow" },
    });

    rerender({ key: "fast" });
    await waitFor(() => expect(result.current.data).toBe("fast-result"));

    // 过期请求此时才返回，不允许覆盖
    resolveSlow("stale-result");
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.data).toBe("fast-result");
    expect(result.current.loading).toBe(false);
  });
});
