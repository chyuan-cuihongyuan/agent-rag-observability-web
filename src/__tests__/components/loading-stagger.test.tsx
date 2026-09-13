// b-26（工单 1148）：骨架入场 stagger 约定测试
import { render } from "@testing-library/react";
import Loading from "@/app/loading";

describe("loading stagger 约定（b-26）", () => {
  it("三张卡片骨架带 stagger-item 与递增 --stagger-i 索引", () => {
    const { container } = render(<Loading />);

    const cards = container.querySelectorAll(".stagger-item");
    expect(cards).toHaveLength(3);
    expect(cards[0].getAttribute("style")).toContain("--stagger-i: 0");
    expect(cards[2].getAttribute("style")).toContain("--stagger-i: 2");
  });
});
