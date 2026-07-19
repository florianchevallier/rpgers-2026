import { afterEach, describe, expect, it, vi } from "vitest";
import { cached, cachedSWR, invalidate } from "@/server/cache";

afterEach(() => {
  invalidate("test:");
  vi.useRealTimers();
});

describe("cache mémoire", () => {
  it("déduplique les chargements concurrents", async () => {
    let resolveValue: (value: number) => void = () => undefined;
    const fetcher = vi.fn(
      () =>
        new Promise<number>((resolve) => {
          resolveValue = resolve;
        }),
    );

    const first = cached("test:dedupe", 1000, fetcher);
    const second = cached("test:dedupe", 1000, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);

    resolveValue(42);
    await expect(Promise.all([first, second])).resolves.toEqual([42, 42]);
  });

  it("sert la valeur stale immédiatement pendant la revalidation", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(0));

    let resolveRefresh: (value: string) => void = () => undefined;
    const fetcher = vi
      .fn<() => Promise<string>>()
      .mockResolvedValueOnce("ancienne")
      .mockImplementationOnce(
        () =>
          new Promise<string>((resolve) => {
            resolveRefresh = resolve;
          }),
      );

    await expect(cachedSWR("test:swr", 100, 1000, fetcher)).resolves.toBe(
      "ancienne",
    );
    vi.setSystemTime(new Date(150));

    await expect(cachedSWR("test:swr", 100, 1000, fetcher)).resolves.toBe(
      "ancienne",
    );
    expect(fetcher).toHaveBeenCalledTimes(2);

    resolveRefresh("nouvelle");
    await Promise.resolve();
    await Promise.resolve();

    await expect(cachedSWR("test:swr", 100, 1000, fetcher)).resolves.toBe(
      "nouvelle",
    );
  });

  it("conserve la dernière donnée connue si la source tombe", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(0));
    const fetcher = vi
      .fn<() => Promise<string>>()
      .mockResolvedValueOnce("snapshot")
      .mockRejectedValueOnce(new Error("réseau indisponible"));

    await cachedSWR("test:fallback", 100, 100, fetcher);
    vi.setSystemTime(new Date(500));

    await expect(cachedSWR("test:fallback", 100, 100, fetcher)).resolves.toBe(
      "snapshot",
    );
  });
});
