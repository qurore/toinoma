// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock helpers for Supabase's chainable query builder pattern
// ---------------------------------------------------------------------------

type MockQueryResult<T = unknown> = {
  data: T | null;
  error: { message: string; code: string } | null;
};

function createChainableQuery<T>(result: MockQueryResult<T>) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  };
  return chain;
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

// Import the mocked modules so we can configure them per test
const { createClient } = await import("@/lib/supabase/server");
const { revalidatePath } = await import("next/cache");
const { redirect } = await import("next/navigation");

// Import the actions under test
const {
  createCollection,
  updateCollection,
  deleteCollection,
  addToCollection,
  removeFromCollection,
} = await import("./actions");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_USER_ID = "user-uuid-123";
const MOCK_COLLECTION_ID = "col-uuid-456";
const MOCK_PROBLEM_SET_ID = "ps-uuid-789";

function makeFormData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    fd.set(key, value);
  }
  return fd;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("createCollection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setupSupabaseMock(options: {
    user?: { id: string } | null;
    insertResult?: MockQueryResult<{ id: string }>;
  }) {
    const {
      user = { id: MOCK_USER_ID },
      insertResult = { data: { id: MOCK_COLLECTION_ID }, error: null },
    } = options;

    const collectionsChain = createChainableQuery(insertResult);

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user },
        }),
      },
      from: vi.fn().mockReturnValue(collectionsChain),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);
    return { mockSupabase, collectionsChain };
  }

  it("should return error when not authenticated", async () => {
    setupSupabaseMock({ user: null });

    const result = await createCollection(makeFormData({ name: "Test" }));

    expect(result).toEqual({ error: "認証が必要です" });
  });

  it("should return error for empty name", async () => {
    setupSupabaseMock({});

    const result = await createCollection(makeFormData({ name: "" }));

    expect(result).toEqual({ error: "コレクション名を入力してください" });
  });

  it("should return error for whitespace-only name", async () => {
    setupSupabaseMock({});

    const result = await createCollection(makeFormData({ name: "   " }));

    expect(result).toEqual({ error: "コレクション名を入力してください" });
  });

  it("should call insert with correct data", async () => {
    const { mockSupabase, collectionsChain } = setupSupabaseMock({});

    await createCollection(
      makeFormData({ name: "My Collection", description: "A description" })
    );

    expect(mockSupabase.from).toHaveBeenCalledWith("collections");
    expect(collectionsChain.insert).toHaveBeenCalledWith({
      user_id: MOCK_USER_ID,
      name: "My Collection",
      description: "A description",
    });
    expect(collectionsChain.select).toHaveBeenCalledWith("id");
    expect(collectionsChain.single).toHaveBeenCalled();
  });

  it("should redirect on successful creation", async () => {
    setupSupabaseMock({});

    await createCollection(makeFormData({ name: "My Collection" }));

    expect(redirect).toHaveBeenCalledWith(
      `/dashboard/collections/${MOCK_COLLECTION_ID}`
    );
  });
});

describe("updateCollection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setupSupabaseMock(options: {
    user?: { id: string } | null;
    updateResult?: { data: null; error: { message: string; code: string } | null };
  }) {
    const {
      user = { id: MOCK_USER_ID },
      updateResult = { data: null, error: null },
    } = options;

    const collectionsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(updateResult),
      update: vi.fn().mockReturnThis(),
    };

    // For update, the chain ends at the second .eq() call.
    // The update().eq().eq() pattern resolves via the last .eq() returning the chain itself,
    // and then the awaited result comes from the underlying mock.
    // We need to make the chain resolve to updateResult when awaited.
    const fromReturn = {
      ...collectionsChain,
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(updateResult),
        }),
      }),
    };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user },
        }),
      },
      from: vi.fn().mockReturnValue(fromReturn),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);
    return { mockSupabase, fromReturn };
  }

  it("should return error when not authenticated", async () => {
    setupSupabaseMock({ user: null });

    const result = await updateCollection(
      MOCK_COLLECTION_ID,
      makeFormData({ name: "Updated" })
    );

    expect(result).toEqual({ error: "認証が必要です" });
  });

  it("should call update with correct data", async () => {
    const { mockSupabase, fromReturn } = setupSupabaseMock({});

    const result = await updateCollection(
      MOCK_COLLECTION_ID,
      makeFormData({ name: "Updated Name", description: "Updated desc" })
    );

    expect(mockSupabase.from).toHaveBeenCalledWith("collections");
    expect(fromReturn.update).toHaveBeenCalledWith({
      name: "Updated Name",
      description: "Updated desc",
    });
    expect(result).toEqual({ success: true });
    expect(revalidatePath).toHaveBeenCalledWith(
      `/dashboard/collections/${MOCK_COLLECTION_ID}`
    );
  });
});

describe("deleteCollection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setupSupabaseMock(options: {
    user?: { id: string } | null;
    deleteResult?: { data: null; error: { message: string; code: string } | null };
  }) {
    const {
      user = { id: MOCK_USER_ID },
      deleteResult = { data: null, error: null },
    } = options;

    const fromReturn = {
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(deleteResult),
        }),
      }),
    };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user },
        }),
      },
      from: vi.fn().mockReturnValue(fromReturn),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);
    return { mockSupabase, fromReturn };
  }

  it("should return error when not authenticated", async () => {
    setupSupabaseMock({ user: null });

    const result = await deleteCollection(MOCK_COLLECTION_ID);

    expect(result).toEqual({ error: "認証が必要です" });
  });

  it("should call delete and redirect", async () => {
    const { mockSupabase } = setupSupabaseMock({});

    await deleteCollection(MOCK_COLLECTION_ID);

    expect(mockSupabase.from).toHaveBeenCalledWith("collections");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/collections");
    expect(redirect).toHaveBeenCalledWith("/dashboard/collections");
  });
});

describe("addToCollection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setupSupabaseMock(options: {
    user?: { id: string } | null;
    count?: number | null;
    insertError?: { message: string; code: string } | null;
  }) {
    const {
      user = { id: MOCK_USER_ID },
      count = 3,
      insertError = null,
    } = options;

    // Build the select chain for counting: .select("id", { count: "exact", head: true }).eq(...)
    const selectCountChain = {
      eq: vi.fn().mockResolvedValue({ count }),
    };

    // Build the insert chain: .insert({...}) which resolves directly
    const insertResult = {
      data: null,
      error: insertError,
    };

    const fromCallIndex: Record<string, number> = {};

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user },
        }),
      },
      from: vi.fn((table: string) => {
        if (!fromCallIndex[table]) fromCallIndex[table] = 0;
        fromCallIndex[table]++;

        if (table === "collection_items") {
          // First call: count query; Second call: insert
          if (fromCallIndex[table] === 1) {
            return {
              select: vi.fn().mockReturnValue(selectCountChain),
            };
          }
          return {
            insert: vi.fn().mockResolvedValue(insertResult),
          };
        }
        return createChainableQuery({ data: null, error: null });
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);
    return { mockSupabase };
  }

  it("should return error when not authenticated", async () => {
    setupSupabaseMock({ user: null });

    const result = await addToCollection(
      MOCK_COLLECTION_ID,
      MOCK_PROBLEM_SET_ID
    );

    expect(result).toEqual({ error: "認証が必要です" });
  });

  it("should handle duplicate (error code 23505)", async () => {
    setupSupabaseMock({
      insertError: { message: "duplicate key", code: "23505" },
    });

    const result = await addToCollection(
      MOCK_COLLECTION_ID,
      MOCK_PROBLEM_SET_ID
    );

    expect(result).toEqual({
      error: "この問題セットは既にコレクションに追加されています",
    });
  });

  it("should insert with next position", async () => {
    const { mockSupabase } = setupSupabaseMock({ count: 5 });

    const result = await addToCollection(
      MOCK_COLLECTION_ID,
      MOCK_PROBLEM_SET_ID
    );

    expect(result).toEqual({ success: true });

    // Verify from was called twice for collection_items (count + insert)
    const collectionItemsCalls = mockSupabase.from.mock.calls.filter(
      (call: string[]) => call[0] === "collection_items"
    );
    expect(collectionItemsCalls).toHaveLength(2);

    // Verify the insert call used the correct data
    const insertCall = mockSupabase.from.mock.results[1].value;
    expect(insertCall.insert).toHaveBeenCalledWith({
      collection_id: MOCK_COLLECTION_ID,
      problem_set_id: MOCK_PROBLEM_SET_ID,
      position: 5,
    });

    expect(revalidatePath).toHaveBeenCalledWith(
      `/dashboard/collections/${MOCK_COLLECTION_ID}`
    );
  });
});

describe("removeFromCollection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setupSupabaseMock(options: {
    user?: { id: string } | null;
    deleteResult?: { data: null; error: { message: string; code: string } | null };
  }) {
    const {
      user = { id: MOCK_USER_ID },
      deleteResult = { data: null, error: null },
    } = options;

    const fromReturn = {
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(deleteResult),
        }),
      }),
    };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user },
        }),
      },
      from: vi.fn().mockReturnValue(fromReturn),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);
    return { mockSupabase, fromReturn };
  }

  it("should return error when not authenticated", async () => {
    setupSupabaseMock({ user: null });

    const result = await removeFromCollection(
      MOCK_COLLECTION_ID,
      MOCK_PROBLEM_SET_ID
    );

    expect(result).toEqual({ error: "認証が必要です" });
  });

  it("should delete correct item", async () => {
    const { mockSupabase } = setupSupabaseMock({});

    const result = await removeFromCollection(
      MOCK_COLLECTION_ID,
      MOCK_PROBLEM_SET_ID
    );

    expect(mockSupabase.from).toHaveBeenCalledWith("collection_items");
    expect(result).toEqual({ success: true });
    expect(revalidatePath).toHaveBeenCalledWith(
      `/dashboard/collections/${MOCK_COLLECTION_ID}`
    );
  });
});
