-- Add cached aggregate columns for efficient sorting
ALTER TABLE problem_sets
ADD COLUMN IF NOT EXISTS purchase_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_rating numeric(3,2),
ADD COLUMN IF NOT EXISTS review_count integer NOT NULL DEFAULT 0;

-- Backfill existing data
UPDATE problem_sets ps SET
  purchase_count = COALESCE((SELECT COUNT(*) FROM purchases p WHERE p.problem_set_id = ps.id), 0),
  review_count = COALESCE((SELECT COUNT(*) FROM reviews r WHERE r.problem_set_id = ps.id), 0),
  avg_rating = (SELECT AVG(r.rating)::numeric(3,2) FROM reviews r WHERE r.problem_set_id = ps.id);

-- Trigger to update purchase_count on insert/delete
CREATE OR REPLACE FUNCTION update_problem_set_purchase_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE problem_sets SET purchase_count = purchase_count + 1 WHERE id = NEW.problem_set_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE problem_sets SET purchase_count = GREATEST(purchase_count - 1, 0) WHERE id = OLD.problem_set_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_purchase_count ON purchases;
CREATE TRIGGER trg_purchase_count
AFTER INSERT OR DELETE ON purchases
FOR EACH ROW EXECUTE FUNCTION update_problem_set_purchase_count();

-- Trigger to update avg_rating and review_count on insert/update/delete
CREATE OR REPLACE FUNCTION update_problem_set_review_stats()
RETURNS TRIGGER AS $$
DECLARE
  target_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_id := OLD.problem_set_id;
  ELSE
    target_id := NEW.problem_set_id;
  END IF;

  UPDATE problem_sets SET
    review_count = COALESCE((SELECT COUNT(*) FROM reviews WHERE problem_set_id = target_id), 0),
    avg_rating = (SELECT AVG(rating)::numeric(3,2) FROM reviews WHERE problem_set_id = target_id)
  WHERE id = target_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_review_stats ON reviews;
CREATE TRIGGER trg_review_stats
AFTER INSERT OR UPDATE OF rating OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_problem_set_review_stats();

-- Indexes for sort queries
CREATE INDEX IF NOT EXISTS idx_problem_sets_purchase_count ON problem_sets(purchase_count DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_problem_sets_avg_rating ON problem_sets(avg_rating DESC NULLS LAST) WHERE status = 'published';
