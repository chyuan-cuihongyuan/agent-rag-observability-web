import { truncate } from "@/lib/truncate";

describe("truncate 截断语义", () => {
  it("空值返回占位符", () => {
    expect(truncate(null, 10)).toBe("-");
    expect(truncate(undefined, 10)).toBe("-");
  });

  it("短于阈值直通", () => {
    expect(truncate("短文本", 10)).toBe("短文本");
    expect(truncate("", 10)).toBe("");
  });

  it("恰好等于阈值不截断（边界含）", () => {
    expect(truncate("12345", 5)).toBe("12345");
  });

  it("超长截断加省略号", () => {
    expect(truncate("abcdef", 3)).toBe("abc...");
  });
});
