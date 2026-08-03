import { GET } from "./route";

describe("GET /api/health", () => {
  it('should return { status: "ok" }', async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: "ok" });
  });
});
