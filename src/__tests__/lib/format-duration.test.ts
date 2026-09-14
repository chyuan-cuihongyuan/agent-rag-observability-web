import { formatDuration } from "@/lib/format-duration";

describe("formatDuration 分级与防御", () => {
  it("空值与非法值返回占位符", () => {
    expect(formatDuration(null)).toBe("—");
    expect(formatDuration(undefined)).toBe("—");
    expect(formatDuration(NaN)).toBe("—");
    expect(formatDuration(-5)).toBe("—");
  });

  it("亚毫秒显示为 <1ms", () => {
    expect(formatDuration(0)).toBe("<1ms");
    expect(formatDuration(0.9)).toBe("<1ms");
  });

  it("毫秒级取整", () => {
    expect(formatDuration(1)).toBe("1ms");
    expect(formatDuration(86.7)).toBe("87ms");
    expect(formatDuration(999)).toBe("999ms");
  });

  it("秒级两位小数（floor 截断防跨级进位）", () => {
    expect(formatDuration(1000)).toBe("1.00s");
    expect(formatDuration(1234)).toBe("1.23s");
    expect(formatDuration(59999)).toBe("59.99s");
  });

  it("分级到分钟补零（floor 不进位）", () => {
    expect(formatDuration(60000)).toBe("1m 00s");
    expect(formatDuration(125000)).toBe("2m 05s");
    expect(formatDuration(3599999)).toBe("59m 59s");
  });

  it("分级到小时", () => {
    expect(formatDuration(3600000)).toBe("1h 00m");
    expect(formatDuration(3720000)).toBe("1h 02m");
  });
});
