import { expect, test } from "@playwright/test";

const envelope = (data: unknown) => ({
  code: "0000",
  info: "success",
  data,
});

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/dashboard/overview**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(envelope({
        totalRequests: 42,
        successRate: 97.5,
        avgCostTimeMs: 320,
        emptyRetrievalRate: 1.2,
        failRate: 2.5,
      })),
    });
  });
  await page.route("**/api/v1/dashboard/trend**", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(envelope([])) });
  });
  await page.route("**/api/v1/dashboard/branch_distribution**", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(envelope([])) });
  });
  await page.route("**/api/v1/dashboard/tool_usage**", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(envelope([])) });
  });
  await page.route("**/api/v1/dashboard/error_ranking**", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(envelope([])) });
  });
  await page.route("**/api/v1/query/trace/list", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(envelope({
        list: [{
          traceId: "trace-001",
          sessionId: "session-001",
          agentId: "agent-1",
          agentStatus: "SUCCESS",
          costTimeMs: 123,
          sourceService: "test-service",
          createTime: "2026-05-30 10:00:00",
        }],
        total: 1,
        page: 1,
        size: 20,
      })),
    });
  });
  await page.route("**/api/v1/eval/dataset/list**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(envelope({
        list: [{ datasetId: "dataset-1", datasetName: "回归数据集", itemCount: 2, createTime: "2026-05-30" }],
      })),
    });
  });
  await page.route("**/api/v1/eval/task/list**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(envelope({
        list: [{ taskId: "task-1", taskName: "RAG 回归评测", evalType: "rag", status: "COMPLETED", avgOverallScore: 0.92, createTime: "2026-05-30" }],
        total: 1,
        page: 1,
        size: 20,
      })),
    });
  });
});

test("dashboard renders overview cards", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "仪表盘" })).toBeVisible();
  await expect(page.getByText("42")).toBeVisible();
});

test("trace list renders mocked trace result", async ({ page }) => {
  await page.goto("/traces");

  await expect(page.getByRole("heading", { name: "Trace 查询" })).toBeVisible();
  await expect(page.getByText("trace-001")).toBeVisible();
  await expect(page.getByText("SUCCESS")).toBeVisible();
});

test("eval page renders datasets and tasks", async ({ page }) => {
  await page.goto("/eval");

  await expect(page.getByRole("heading", { name: "评测管理" })).toBeVisible();
  await expect(page.getByText("回归数据集")).toBeVisible();
  await expect(page.getByText("RAG 回归评测")).toBeVisible();
});
