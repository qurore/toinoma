-- FR-034: Custom collections data model
-- Collections allow users to organize purchased problem sets into study groups

CREATE TABLE public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  problem_set_id UUID NOT NULL REFERENCES public.problem_sets(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(collection_id, problem_set_id)
);

-- Indexes
CREATE INDEX idx_collections_user_id ON public.collections(user_id);
CREATE INDEX idx_collection_items_collection_id ON public.collection_items(collection_id);
CREATE INDEX idx_collection_items_problem_set_id ON public.collection_items(problem_set_id);

-- RLS
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;

-- Collections: users can manage their own collections
CREATE POLICY "Users can view own collections"
  ON public.collections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own collections"
  ON public.collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own collections"
  ON public.collections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own collections"
  ON public.collections FOR DELETE
  USING (auth.uid() = user_id);

-- Collection items: users can manage items in their own collections
CREATE POLICY "Users can view items in own collections"
  ON public.collection_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.collections
      WHERE id = collection_items.collection_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add items to own collections"
  ON public.collection_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.collections
      WHERE id = collection_items.collection_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update items in own collections"
  ON public.collection_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.collections
      WHERE id = collection_items.collection_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove items from own collections"
  ON public.collection_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.collections
      WHERE id = collection_items.collection_id
      AND user_id = auth.uid()
    )
  );

-- Trigger for updated_at on collections
CREATE TRIGGER handle_collections_updated_at
  BEFORE UPDATE ON public.collections
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Grants
GRANT ALL ON public.collections TO authenticated;
GRANT ALL ON public.collection_items TO authenticated;
