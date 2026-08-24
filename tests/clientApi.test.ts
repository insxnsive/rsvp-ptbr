import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../src/client/api.js";

type MockResponse = {
  ok: boolean;
  json: () => Promise<unknown>;
};

describe("client api", () => {
  const fetchMock = vi.fn<(...args: unknown[]) => Promise<MockResponse>>();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ deleted: true, authenticated: false })
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("does not send a JSON content-type header for delete requests without a body", async () => {
    await api.deleteEvent("event-1");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("DELETE");
    expect(init.headers).toBeUndefined();
  });

  it("sends a JSON content-type header for requests with a JSON body", async () => {
    await api.login("admin", "secret");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ "Content-Type": "application/json" });
  });

  it("cancels a guest search when its caller aborts", async () => {
    const externalController = new AbortController();
    let requestSignal: AbortSignal | undefined;
    fetchMock.mockImplementation((_url, initValue) => {
      const init = initValue as RequestInit;
      requestSignal = init.signal ?? undefined;
      return new Promise<MockResponse>((_resolve, reject) => {
        requestSignal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), {
          once: true
        });
      });
    });

    const request = api.publicGuests("casamento", "ana", externalController.signal);
    externalController.abort();

    await expect(request).rejects.toMatchObject({ message: "Requisicao cancelada.", status: 0 });
    expect(requestSignal?.aborted).toBe(true);
  });
});
