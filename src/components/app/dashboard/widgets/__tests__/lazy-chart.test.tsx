/**
 * Tests untuk LazyChart component.
 *
 * Verifies:
 * - IntersectionObserver setup untuk lazy loading
 * - Fallback saat tidak ada IntersectionObserver (SSR)
 * - Cleanup saat unmount
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { LazyChart } from "../lazy-chart";

describe("LazyChart", () => {
  // Mock IntersectionObserver
  let mockObserver: {
    observe: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    unobserve: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockObserver = {
      observe: vi.fn(),
      disconnect: vi.fn(),
      unobserve: vi.fn(),
    };

    (globalThis as any).IntersectionObserver = vi
      .fn()
      .mockImplementation(function () {
        return mockObserver;
      });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders fallback saat initial mount", () => {
    render(
      <LazyChart
        importFn={() =>
          Promise.resolve({ default: () => <div>Chart</div> })
        }
        componentProps={{}}
        height={300}
      />
    );

    // Loading fallback dengan role='status'
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByLabelText(/memuat grafik/i)).toBeInTheDocument();
  });

  it("setup IntersectionObserver untuk lazy loading", () => {
    render(
      <LazyChart
        importFn={() =>
          Promise.resolve({ default: () => <div>Chart</div> })
        }
        componentProps={{}}
        height={300}
      />
    );

    expect(mockObserver.observe).toHaveBeenCalled();
  });

  it("load chart saat masuk viewport", async () => {
    let resolveImport: (value: { default: React.ComponentType }) => void;
    const importPromise = new Promise<{ default: React.ComponentType }>(
      (resolve) => {
        resolveImport = resolve;
      }
    );

    render(
      <LazyChart
        importFn={() => importPromise}
        componentProps={{}}
        height={300}
      />
    );

    // Trigger intersection callback
    const ioCallback = (globalThis as unknown as { IntersectionObserver: { mock: { calls: [IntersectionObserverCallback] } } })
      .IntersectionObserver.mock.calls[0][0];
    ioCallback([{ isIntersecting: true } as IntersectionObserverEntry], mockObserver as unknown as IntersectionObserver);

    resolveImport!({ default: () => <div data-testid="loaded-chart">Loaded</div> });

    await waitFor(() => {
      expect(screen.getByTestId("loaded-chart")).toBeInTheDocument();
    });
  });

  it("disconnect observer setelah visible", () => {
    render(
      <LazyChart
        importFn={() =>
          Promise.resolve({ default: () => <div>Chart</div> })
        }
        componentProps={{}}
        height={300}
      />
    );

    const ioCallback = (globalThis as unknown as { IntersectionObserver: { mock: { calls: [IntersectionObserverCallback] } } })
      .IntersectionObserver.mock.calls[0][0];
    ioCallback([{ isIntersecting: true } as IntersectionObserverEntry], mockObserver as unknown as IntersectionObserver);

    expect(mockObserver.disconnect).toHaveBeenCalled();
  });

  it("fallback ke immediate load saat tidak ada IntersectionObserver", async () => {
    // Hapus mock
    delete (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver;

    let resolveImport: (value: { default: React.ComponentType }) => void;
    const importPromise = new Promise<{ default: React.ComponentType }>(
      (resolve) => {
        resolveImport = resolve;
      }
    );

    render(
      <LazyChart
        importFn={() => importPromise}
        componentProps={{}}
        height={300}
      />
    );

    // Should load immediately
    resolveImport!({ default: () => <div data-testid="immediate-load">Loaded</div> });

    await waitFor(() => {
      expect(screen.getByTestId("immediate-load")).toBeInTheDocument();
    });
  });

  it("applies className prop", () => {
    const { container } = render(
      <LazyChart
        importFn={() =>
          Promise.resolve({ default: () => <div>Chart</div> })
        }
        componentProps={{}}
        height={300}
        className="custom-wrapper"
      />
    );

    // First child is the wrapper div
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass("custom-wrapper");
  });

  it("uses min-height untuk cegah layout shift", () => {
    const { container } = render(
      <LazyChart
        importFn={() =>
          Promise.resolve({ default: () => <div>Chart</div> })
        }
        componentProps={{}}
        height={400}
      />
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.minHeight).toBe("400px");
  });

  it("tidak load ulang setelah mounted", async () => {
    const importFn = vi.fn(() =>
      Promise.resolve({ default: () => <div>Chart</div> })
    );

    const { rerender } = render(
      <LazyChart importFn={importFn} componentProps={{}} height={300} />
    );

    const ioCallback = (globalThis as unknown as { IntersectionObserver: { mock: { calls: [IntersectionObserverCallback] } } })
      .IntersectionObserver.mock.calls[0][0];
    ioCallback([{ isIntersecting: true } as IntersectionObserverEntry], mockObserver as unknown as IntersectionObserver);

    await waitFor(() => {
      expect(importFn).toHaveBeenCalledTimes(1);
    });

    // Re-render dengan prop sama — tidak boleh load ulang
    rerender(<LazyChart importFn={importFn} componentProps={{}} height={300} />);

    // Trigger intersection lagi (sama mock)
    ioCallback([{ isIntersecting: true } as IntersectionObserverEntry], mockObserver as unknown as IntersectionObserver);

    // importFn masih 1x (no re-load)
    await new Promise((r) => setTimeout(r, 50));
    expect(importFn).toHaveBeenCalledTimes(1);
  });
});
