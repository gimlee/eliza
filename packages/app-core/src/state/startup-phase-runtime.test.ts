import { afterEach, describe, expect, it, vi } from "vitest";
import { client } from "../api";
import type { StartupEvent } from "./startup-coordinator";
import {
  type StartingRuntimeDeps,
  runStartingRuntime,
} from "./startup-phase-runtime";

function createDeps(): StartingRuntimeDeps {
  return {
    setAgentStatus: vi.fn(),
    setConnected: vi.fn(),
    setStartupError: vi.fn(),
    setOnboardingLoading: vi.fn(),
    setAuthRequired: vi.fn(),
    setPairingEnabled: vi.fn(),
    setPairingExpiresAt: vi.fn(),
    setPendingRestart: vi.fn(),
    setPendingRestartReasons: vi.fn(),
  };
}

async function runOnce(deps: StartingRuntimeDeps): Promise<StartupEvent[]> {
  const events: StartupEvent[] = [];
  const effectRunRef = { current: 1 };
  await runStartingRuntime(
    deps,
    (event) => events.push(event),
    1,
    effectRunRef,
    { current: false },
    { current: null },
  );
  return events;
}

describe("runStartingRuntime auth recovery", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("routes unauthenticated 401s back to the pairing/auth gate", async () => {
    const expiresAt = Date.now() + 60_000;
    vi.spyOn(client, "getStatus").mockRejectedValue({
      kind: "http",
      status: 401,
      path: "/api/status",
      message: "Unauthorized",
    });
    vi.spyOn(client, "hasToken").mockReturnValue(false);
    vi.spyOn(client, "getAuthStatus").mockResolvedValue({
      required: true,
      authenticated: false,
      loginRequired: false,
      localAccess: false,
      passwordConfigured: false,
      pairingEnabled: true,
      expiresAt,
    });

    const deps = createDeps();
    const events = await runOnce(deps);

    expect(deps.setAuthRequired).toHaveBeenCalledWith(true);
    expect(deps.setPairingEnabled).toHaveBeenCalledWith(true);
    expect(deps.setPairingExpiresAt).toHaveBeenCalledWith(expiresAt);
    expect(deps.setOnboardingLoading).toHaveBeenCalledWith(false);
    expect(events).toEqual([{ type: "BACKEND_AUTH_REQUIRED" }]);
  });
});
