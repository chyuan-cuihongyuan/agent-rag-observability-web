// b-18（工单 1132）：web-vitals 上报分支契约测试（纯函数直测，
// 规避 Next 对 NEXT_PUBLIC_* 的构建期内联——见 lib 源码注）
import { report } from "@/lib/web-vitals";

const metric = { name: "LCP", value: 1234.5, rating: "good", id: "v1" };

describe("web-vitals 上报分支（b-18）", () => {
  let debugSpy: jest.SpyInstance;
  let beaconSpy: jest.Mock;

  beforeEach(() => {
    debugSpy = jest.spyOn(console, "debug").mockImplementation();
    debugSpy.mockClear();
    beaconSpy = jest.fn().mockReturnValue(true);
    Object.defineProperty(navigator, "sendBeacon", {
      value: beaconSpy,
      configurable: true,
    });
  });

  it("开关关闭：完全不动作", () => {
    report(metric, false, "https://obs.example.com/vitals");

    expect(beaconSpy).not.toHaveBeenCalled();
    expect(debugSpy).not.toHaveBeenCalled();
  });

  it("开启且无 endpoint：console.debug 输出结构化 payload", () => {
    report(metric, true);

    expect(debugSpy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(debugSpy.mock.calls[0][1]);
    expect(payload).toMatchObject({ name: "LCP", value: 1234.5, id: "v1" });
    expect(beaconSpy).not.toHaveBeenCalled();
  });

  it("开启且有 endpoint：sendBeacon 上报（fetch 兜底不触发）", () => {
    report(metric, true, "https://obs.example.com/vitals");

    expect(beaconSpy).toHaveBeenCalledWith(
      "https://obs.example.com/vitals",
      expect.stringContaining('"name":"LCP"'),
    );
    expect(debugSpy).not.toHaveBeenCalled();
  });
});
