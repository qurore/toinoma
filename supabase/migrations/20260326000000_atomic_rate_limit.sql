-- Atomic rate limit check-and-increment function.
-- Eliminates the TOCTOU race condition in the previous read-then-update approach.
-- A single SQL call atomically:
--   1. Resets the window if expired
--   2. Increments the counter
--   3. Returns whether the request is allowed
--
-- Returns a single row with (allowed boolean, current_count int, window_end_ms bigint).

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key text,
  p_max_requests integer,
  p_window_ms integer
)
RETURNS TABLE(allowed boolean, current_count integer, window_end_ms bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_now timestamptz := now();
  v_now_ms bigint := (extract(epoch from v_now) * 1000)::bigint;
  v_row record;
BEGIN
  -- Attempt to insert a new record. On conflict (key already exists),
  -- reset the window if expired, otherwise increment the count.
  INSERT INTO public.rate_limits (key, count, window_start, window_ms)
  VALUES (p_key, 1, v_now, p_window_ms)
  ON CONFLICT (key) DO UPDATE SET
    count = CASE
      -- Window expired: reset to 1
      WHEN rate_limits.window_start + (rate_limits.window_ms || ' milliseconds')::interval < v_now
        THEN 1
      -- Window active: increment
      ELSE rate_limits.count + 1
    END,
    window_start = CASE
      WHEN rate_limits.window_start + (rate_limits.window_ms || ' milliseconds')::interval < v_now
        THEN v_now
      ELSE rate_limits.window_start
    END,
    window_ms = p_window_ms
  RETURNING
    rate_limits.count,
    rate_limits.window_start,
    rate_limits.window_ms
  INTO v_row;

  RETURN QUERY SELECT
    (v_row.count <= p_max_requests)::boolean AS allowed,
    v_row.count::integer AS current_count,
    ((extract(epoch from v_row.window_start) * 1000)::bigint + v_row.window_ms::bigint) AS window_end_ms;
END;
$$;
