// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { GradingResult, ProblemSetRubric } from "@toinoma/shared/schemas";

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
  };
  return chain;
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/ai/grading-engine", () => ({
  gradeSubmission: vi.fn(),
}));

vi.mock("@/lib/subscription", () => ({
  getSubscriptionState: vi.fn().mockResolvedValue({
    tier: "free",
    isActive: true,
    gradingLimit: 3,
    gradingsUsedThisMonth: 0,
    gradingsRemaining: 3,
    canGrade: true,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  }),
}));

// Import the mocked modules so we can configure them per test
const { createClient } = await import("@/lib/supabase/server");
const { gradeSubmission } = await import("@/lib/ai/grading-engine");

// Import the route handler under test
const { POST } = await import("./route");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_USER_ID = "user-uuid-123";
const MOCK_PROBLEM_SET_ID = "ps-uuid-456";
const MOCK_SUBMISSION_ID = "sub-uuid-789";

const validRubric: ProblemSetRubric = {
  sections: [
    {
      number: 1,
      points: 10,
      questions: [
        {
          type: "mark_sheet",
          number: "(1)",
          points: 5,
          correctAnswer: "B",
          choices: ["A", "B", "C", "D"],
        },
        {
          type: "fill_in_blank",
          number: "(2)",
          points: 5,
          acceptedAnswers: ["Tokyo"],
          caseSensitive: false,
        },
      ],
    },
  ],
};

const validAnswers = {
  "1-(1)": { type: "mark_sheet" as const, selected: "B" },
  "1-(2)": { type: "fill_in_blank" as const, text: "Tokyo" },
};

const mockGradingResult: GradingResult = {
  totalScore: 10,
  maxScore: 10,
  sections: [
    {
      number: 1,
      score: 10,
      maxScore: 10,
      questions: [
        {
          number: "(1)",
          score: 5,
          maxScore: 5,
          feedback: "正解です。",
          rubricMatches: [
            {
              element: "正解: B",
              matched: true,
              pointsAwarded: 5,
              pointsPossible: 5,
              explanation: "選択肢が正解と一致しています。",
            },
          ],
        },
        {
          number: "(2)",
          score: 5,
          maxScore: 5,
          feedback: "正解です。",
          rubricMatches: [
            {
              element: "正解: Tokyo",
              matched: true,
              pointsAwarded: 5,
              pointsPossible: 5,
              explanation: "回答が正解と一致しています。",
            },
          ],
        },
      ],
    },
  ],
  overallFeedback: "全問正解です。素晴らしい結果です！",
};

function makeRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/grading", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("POST /api/grading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // Helper to configure the Supabase mock per test.
  // Tracks from() calls by table name and returns appropriate chain builders.
  // -----------------------------------------------------------------------
  function setupSupabaseMock(options: {
    user?: { id: string; email?: string } | null;
    purchase?: { id: string } | null;
    problemSet?: { rubric: unknown } | null;
    insertResult?: MockQueryResult<{ id: string }>;
  }) {
    const {
      user = { id: MOCK_USER_ID, email: "student@example.com" },
      purchase = { id: "purchase-uuid-abc" },
      problemSet = { rubric: validRubric },
      insertResult = {
        data: { id: MOCK_SUBMISSION_ID },
        error: null,
      },
    } = options;

    const fromCalls: Record<
      string,
      ReturnType<typeof createChainableQuery>[]
    > = {
      purchases: [
        createChainableQuery({ data: purchase, error: null }),
      ],
      problem_sets: [
        createChainableQuery({ data: problemSet, error: null }),
      ],
      submissions: [
        createChainableQuery(insertResult),
      ],
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
        const chains = fromCalls[table] ?? [
          createChainableQuery({ data: null, error: null }),
        ];
        const chain = chains[fromCallIndex[table]] ?? chains[chains.length - 1];
        fromCallIndex[table]++;
        return chain;
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);
    return mockSupabase;
  }

  // -----------------------------------------------------------------------
  // 1. Authentication
  // -----------------------------------------------------------------------
  it("should return 401 for unauthenticated requests", async () => {
    setupSupabaseMock({ user: null });

    const res = await POST(
      makeRequest({ problemSetId: MOCK_PROBLEM_SET_ID, answers: validAnswers })
    );
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });

  // -----------------------------------------------------------------------
  // 2. Missing required fields
  // -----------------------------------------------------------------------
  it("should return 400 when problemSetId is missing", async () => {
    setupSupabaseMock({});

    const res = await POST(makeRequest({ answers: validAnswers }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Missing problemSetId or answers");
  });

  it("should return 400 when answers are missing", async () => {
    setupSupabaseMock({});

    const res = await POST(
      makeRequest({ problemSetId: MOCK_PROBLEM_SET_ID })
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Missing problemSetId or answers");
  });

  it("should return 400 when both problemSetId and answers are missing", async () => {
    setupSupabaseMock({});

    const res = await POST(makeRequest({}));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Missing problemSetId or answers");
  });

  // -----------------------------------------------------------------------
  // 3. Not purchased
  // -----------------------------------------------------------------------
  it("should return 403 when problem set has not been purchased", async () => {
    setupSupabaseMock({ purchase: null });

    const res = await POST(
      makeRequest({ problemSetId: MOCK_PROBLEM_SET_ID, answers: validAnswers })
    );
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toBe("Problem set not purchased");
  });

  // -----------------------------------------------------------------------
  // 4. Problem set or rubric not found
  // -----------------------------------------------------------------------
  it("should return 404 when problem set does not exist", async () => {
    setupSupabaseMock({ problemSet: null });

    const res = await POST(
      makeRequest({ problemSetId: MOCK_PROBLEM_SET_ID, answers: validAnswers })
    );
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe("Problem set or rubric not found");
  });

  it("should return 404 when problem set rubric is null", async () => {
    setupSupabaseMock({ problemSet: { rubric: null } });

    const res = await POST(
      makeRequest({ problemSetId: MOCK_PROBLEM_SET_ID, answers: validAnswers })
    );
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe("Problem set or rubric not found");
  });

  // -----------------------------------------------------------------------
  // 5. Invalid rubric format
  // -----------------------------------------------------------------------
  it("should return 500 when rubric has invalid format", async () => {
    setupSupabaseMock({
      problemSet: { rubric: { invalid: "structure" } },
    });

    const res = await POST(
      makeRequest({ problemSetId: MOCK_PROBLEM_SET_ID, answers: validAnswers })
    );
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Invalid rubric format");
  });

  it("should return 500 when rubric sections are empty", async () => {
    setupSupabaseMock({
      problemSet: { rubric: { sections: [] } },
    });

    const res = await POST(
      makeRequest({ problemSetId: MOCK_PROBLEM_SET_ID, answers: validAnswers })
    );
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Invalid rubric format");
  });

  it("should return 500 when rubric has missing question type", async () => {
    setupSupabaseMock({
      problemSet: {
        rubric: {
          sections: [
            {
              number: 1,
              points: 10,
              questions: [{ number: "(1)", points: 10 }], // missing type
            },
          ],
        },
      },
    });

    const res = await POST(
      makeRequest({ problemSetId: MOCK_PROBLEM_SET_ID, answers: validAnswers })
    );
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Invalid rubric format");
  });

  // -----------------------------------------------------------------------
  // 6. Successful grading and storage
  // -----------------------------------------------------------------------
  it("should grade and store submission successfully", async () => {
    const mockSb = setupSupabaseMock({});

    vi.mocked(gradeSubmission).mockResolvedValue(mockGradingResult);

    const res = await POST(
      makeRequest({ problemSetId: MOCK_PROBLEM_SET_ID, answers: validAnswers })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.submissionId).toBe(MOCK_SUBMISSION_ID);
    expect(json.result).toEqual(mockGradingResult);

    // Verify gradeSubmission was called with parsed rubric and answers
    expect(gradeSubmission).toHaveBeenCalledOnce();
    expect(gradeSubmission).toHaveBeenCalledWith({
      rubric: validRubric,
      answers: validAnswers,
    });
  });

  it("should store submission with correct fields", async () => {
    const mockSb = setupSupabaseMock({});
    vi.mocked(gradeSubmission).mockResolvedValue(mockGradingResult);

    await POST(
      makeRequest({ problemSetId: MOCK_PROBLEM_SET_ID, answers: validAnswers })
    );

    // Verify insert was called on submissions table
    const submissionsFrom = mockSb.from.mock.calls.findIndex(
      (call: string[]) => call[0] === "submissions"
    );
    expect(submissionsFrom).toBeGreaterThanOrEqual(0);

    const submissionsChain =
      mockSb.from.mock.results[submissionsFrom].value;
    expect(submissionsChain.insert).toHaveBeenCalledOnce();

    const insertArg = submissionsChain.insert.mock.calls[0][0];
    expect(insertArg.user_id).toBe(MOCK_USER_ID);
    expect(insertArg.problem_set_id).toBe(MOCK_PROBLEM_SET_ID);
    expect(insertArg.score).toBe(mockGradingResult.totalScore);
    expect(insertArg.max_score).toBe(mockGradingResult.maxScore);
    expect(insertArg.graded_at).toBeDefined();
    // answers and feedback are stored as JSON
    expect(insertArg.answers).toEqual(validAnswers);
    expect(insertArg.feedback).toBeDefined();
  });

  it("should return 500 when submission insert fails", async () => {
    setupSupabaseMock({
      insertResult: {
        data: null,
        error: { message: "Insert failed", code: "23505" },
      },
    });

    vi.mocked(gradeSubmission).mockResolvedValue(mockGradingResult);

    const res = await POST(
      makeRequest({ problemSetId: MOCK_PROBLEM_SET_ID, answers: validAnswers })
    );
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Failed to save submission");
  });

  // -----------------------------------------------------------------------
  // Query verification
  // -----------------------------------------------------------------------
  it("should verify purchase with user_id and problem_set_id", async () => {
    const mockSb = setupSupabaseMock({});
    vi.mocked(gradeSubmission).mockResolvedValue(mockGradingResult);

    await POST(
      makeRequest({ problemSetId: MOCK_PROBLEM_SET_ID, answers: validAnswers })
    );

    // First from() call should be purchases
    const purchasesChain = mockSb.from.mock.results[0].value;
    expect(mockSb.from.mock.calls[0][0]).toBe("purchases");
    expect(purchasesChain.eq).toHaveBeenCalledWith("user_id", MOCK_USER_ID);
    expect(purchasesChain.eq).toHaveBeenCalledWith(
      "problem_set_id",
      MOCK_PROBLEM_SET_ID
    );
  });

  it("should fetch rubric by problemSetId", async () => {
    const mockSb = setupSupabaseMock({});
    vi.mocked(gradeSubmission).mockResolvedValue(mockGradingResult);

    await POST(
      makeRequest({ problemSetId: MOCK_PROBLEM_SET_ID, answers: validAnswers })
    );

    // Second from() call should be problem_sets for rubric
    const problemSetsChain = mockSb.from.mock.results[1].value;
    expect(mockSb.from.mock.calls[1][0]).toBe("problem_sets");
    expect(problemSetsChain.select).toHaveBeenCalledWith("rubric");
    expect(problemSetsChain.eq).toHaveBeenCalledWith("id", MOCK_PROBLEM_SET_ID);
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------
  it("should handle essay-type rubric validation correctly", async () => {
    const essayRubric: ProblemSetRubric = {
      sections: [
        {
          number: 1,
          points: 20,
          questions: [
            {
              type: "essay",
              number: "(1)",
              points: 20,
              rubricElements: [
                { element: "Key concept mentioned", points: 10 },
                { element: "Logical coherence", points: 10 },
              ],
              modelAnswer: "Expected essay content",
            },
          ],
        },
      ],
    };

    const essayAnswers = {
      "1-(1)": { type: "essay" as const, text: "Student essay answer" },
    };

    const essayGradingResult: GradingResult = {
      totalScore: 15,
      maxScore: 20,
      sections: [
        {
          number: 1,
          score: 15,
          maxScore: 20,
          questions: [
            {
              number: "(1)",
              score: 15,
              maxScore: 20,
              feedback: "Good understanding but could improve coherence.",
              rubricMatches: [
                {
                  element: "Key concept mentioned",
                  matched: true,
                  pointsAwarded: 10,
                  pointsPossible: 10,
                  explanation: "Concept clearly mentioned.",
                },
                {
                  element: "Logical coherence",
                  matched: false,
                  pointsAwarded: 5,
                  pointsPossible: 10,
                  explanation: "Partial credit for structure.",
                },
              ],
            },
          ],
        },
      ],
      overallFeedback: "Good effort, focus on coherence.",
    };

    setupSupabaseMock({
      problemSet: { rubric: essayRubric },
    });
    vi.mocked(gradeSubmission).mockResolvedValue(essayGradingResult);

    const res = await POST(
      makeRequest({
        problemSetId: MOCK_PROBLEM_SET_ID,
        answers: essayAnswers,
      })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.submissionId).toBe(MOCK_SUBMISSION_ID);
    expect(json.result.totalScore).toBe(15);
    expect(json.result.maxScore).toBe(20);
  });
});
