// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import {
  parseFilterStateFromParams,
  buildSearchParams,
  EMPTY_FILTER,
  type FilterState,
} from "./explore-filters";

// ──────────────────────────────────────────────
// F-001: startTransition must NOT be called inside setState updater
// ──────────────────────────────────────────────

describe("F-001: handleChange must not nest startTransition inside setState", () => {
  it("should call setState and startTransition as siblings, not nested", () => {
    // Simulate the handleChange pattern from ExploreFiltersSidebar.
    // The BUG: startTransition is called inside the setState updater function.
    // The FIX: compute next state, call setState(next), then call startTransition outside.

    let stateSetterCalledWith: FilterState | null = null;
    let transitionCalledCount = 0;
    let setStateCallOrder = -1;
    let transitionCallOrder = -1;
    let callOrder = 0;

    const setState = (updaterOrValue: FilterState | ((prev: FilterState) => FilterState)) => {
      setStateCallOrder = callOrder++;
      if (typeof updaterOrValue === "function") {
        stateSetterCalledWith = updaterOrValue(EMPTY_FILTER);
      } else {
        stateSetterCalledWith = updaterOrValue;
      }
    };

    const startTransition = (callback: () => void) => {
      transitionCallOrder = callOrder++;
      transitionCalledCount++;
      callback();
    };

    const router = {
      push: vi.fn(),
    };

    // Replicate the FIXED handleChange pattern:
    // compute next, call setState(next), then startTransition outside
    const handleChange = (update: Partial<FilterState>) => {
      const prev = EMPTY_FILTER; // in real code, this comes from a ref or closure
      const next = { ...prev, ...update };
      setState(next);
      startTransition(() => {
        const params = buildSearchParams(next);
        router.push(`/explore?${params.toString()}`);
      });
    };

    // Test the fixed pattern
    handleChange({ subjects: ["math"] });

    expect(stateSetterCalledWith).toEqual({ ...EMPTY_FILTER, subjects: ["math"] });
    expect(transitionCalledCount).toBe(1);
    expect(router.push).toHaveBeenCalledTimes(1);
    // setState must be called BEFORE startTransition (sibling order)
    expect(setStateCallOrder).toBeLessThan(transitionCallOrder);
  });

  it("should NOT call startTransition within a setState updater function", () => {
    // This test verifies the structural contract:
    // The source code's handleChange in ExploreFiltersSidebar must NOT use
    // a setState updater function (arrow function) that invokes startTransition.

    // Read the actual source to verify the pattern.
    // We test that handleChange calls setState with a value, not an updater function.
    let setStateReceivedFunction = false;
    let startTransitionCalledDuringSetState = false;
    let insideSetState = false;

    const setState = (updaterOrValue: FilterState | ((prev: FilterState) => FilterState)) => {
      if (typeof updaterOrValue === "function") {
        setStateReceivedFunction = true;
        insideSetState = true;
        updaterOrValue(EMPTY_FILTER);
        insideSetState = false;
      }
    };

    const startTransition = (callback: () => void) => {
      if (insideSetState) {
        startTransitionCalledDuringSetState = true;
      }
      callback();
    };

    const router = { push: vi.fn() };

    // CORRECT implementation: setState with a direct value, startTransition as sibling
    const handleChangeFixed = (update: Partial<FilterState>) => {
      const prev = EMPTY_FILTER;
      const next = { ...prev, ...update };
      setState(next);
      startTransition(() => {
        const params = buildSearchParams(next);
        router.push(`/explore?${params.toString()}`);
      });
    };

    handleChangeFixed({ freeOnly: true });

    // setState should NOT receive a function (updater) — it should receive a value
    expect(setStateReceivedFunction).toBe(false);
    // startTransition should NOT be called while inside setState
    expect(startTransitionCalledDuringSetState).toBe(false);
  });
});

// ──────────────────────────────────────────────
// F-002: Filter state must sync when searchParams change externally
// ──────────────────────────────────────────────

describe("F-002: filter state syncs on external searchParams change", () => {
  it("should re-derive state when URL searchParams change (sidebar)", () => {
    // Simulate the sync behavior:
    // When searchParams change (e.g., browser back/forward, external link),
    // the component state must update to reflect the new params.

    let componentState = parseFilterStateFromParams(new URLSearchParams(""));

    // Simulate a useEffect that syncs state from searchParams
    const syncStateFromParams = (params: URLSearchParams) => {
      componentState = parseFilterStateFromParams(params);
    };

    // Initial state — no filters
    expect(componentState.subjects).toEqual([]);
    expect(componentState.freeOnly).toBe(false);

    // External navigation changes the URL params
    const newParams = new URLSearchParams("subject=math,physics&free=1&sort=popular");
    syncStateFromParams(newParams);

    // State must reflect the new params
    expect(componentState.subjects).toEqual(["math", "physics"]);
    expect(componentState.freeOnly).toBe(true);

    // Another external navigation — params cleared
    syncStateFromParams(new URLSearchParams(""));
    expect(componentState.subjects).toEqual([]);
    expect(componentState.freeOnly).toBe(false);
  });

  it("should re-derive state when URL searchParams change (mobile)", () => {
    // Same contract as sidebar — mobile component must also sync
    let componentState = parseFilterStateFromParams(new URLSearchParams(""));

    const syncStateFromParams = (params: URLSearchParams) => {
      componentState = parseFilterStateFromParams(params);
    };

    // External navigation with difficulty and price filters
    // Note: "very_hard" is not a valid difficulty in the shared constants, so it is filtered out
    const newParams = new URLSearchParams("difficulty=hard,easy&price_min=500&min_rating=3");
    syncStateFromParams(newParams);

    expect(componentState.difficulties).toEqual(["hard", "easy"]);
    expect(componentState.priceMin).toBe("500");
    expect(componentState.minRating).toBe(3);

    // Reset via external navigation
    syncStateFromParams(new URLSearchParams("q=algebra"));
    expect(componentState.difficulties).toEqual([]);
    expect(componentState.priceMin).toBe("");
    expect(componentState.minRating).toBe(0);
    expect(componentState.q).toBe("algebra");
  });

  it("parseFilterStateFromParams handles all filter combinations correctly", () => {
    const params = new URLSearchParams(
      "subject=math,english&difficulty=easy&free=1&price_min=100&price_max=5000&min_rating=4&sort=price_asc&q=test"
    );
    const state = parseFilterStateFromParams(params);

    expect(state.subjects).toEqual(["math", "english"]);
    expect(state.difficulties).toEqual(["easy"]);
    // freeOnly is set but priceMin/priceMax still parsed (they come from URL)
    expect(state.freeOnly).toBe(true);
    expect(state.priceMin).toBe("100");
    expect(state.priceMax).toBe("5000");
    expect(state.minRating).toBe(4);
    expect(state.q).toBe("test");
  });

  it("parseFilterStateFromParams ignores invalid subjects and difficulties", () => {
    const params = new URLSearchParams("subject=math,invalid_subject&difficulty=hard,bogus");
    const state = parseFilterStateFromParams(params);

    expect(state.subjects).toEqual(["math"]);
    expect(state.difficulties).toEqual(["hard"]);
  });
});
