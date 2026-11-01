-- ─── AuditX: Memory Architecture ────────────────────────────────────────────────
-- Implements three-level memory system: working, persistent, and historical
-- Run in Supabase Dashboard → SQL Editor. Safe to run multiple times.

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. Enable pgvector extension for vector columns (semantic search)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. conversations — conversation metadata (replaces chat_threads for enhanced memory)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conversations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id              uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title               text NOT NULL DEFAULT 'New conversation',
  summary             text,                    -- AI-generated summary for memory retrieval
  embedding           vector(1536),            -- Embedding for semantic search
  context_summary     jsonb,                   -- Structured context extracted from conversation
  archived_at         timestamptz,             -- When conversation was archived
  is_archived         boolean NOT NULL DEFAULT false,
  metadata            jsonb DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS conversations_user_idx ON public.conversations (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS conversations_org_idx ON public.conversations (org_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS conversations_archived_idx ON public.conversations (is_archived, updated_at DESC);
CREATE INDEX IF NOT EXISTS conversations_embedding_idx ON public.conversations USING ivfflat (embedding vector_cosine_ops);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_select_conversations" ON public.conversations;
CREATE POLICY "user_select_conversations"
  ON public.conversations FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_insert_conversations" ON public.conversations;
CREATE POLICY "user_insert_conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_update_conversations" ON public.conversations;
CREATE POLICY "user_update_conversations"
  ON public.conversations FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_delete_conversations" ON public.conversations;
CREATE POLICY "user_delete_conversations"
  ON public.conversations FOR DELETE
  USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. messages — individual messages (replaces chat_messages with enhanced memory)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id     uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id              uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role                text NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content             text NOT NULL,
  parts               jsonb DEFAULT '[]'::jsonb,    -- Structured parts (text, images, tool calls)
  tool_calls          jsonb DEFAULT '[]'::jsonb,    -- Tool invocation details
  tool_call_id        text,                         -- For tool responses
  embedding           vector(1536),                 -- For semantic search
  metadata            jsonb DEFAULT '{}'::jsonb,
  position            integer NOT NULL,             -- Order in conversation
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_conversation_idx ON public.messages (conversation_id, position);
CREATE INDEX IF NOT EXISTS messages_user_idx ON public.messages (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_embedding_idx ON public.messages USING ivfflat (embedding vector_cosine_ops);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_select_messages" ON public.messages;
CREATE POLICY "user_select_messages"
  ON public.messages FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_insert_messages" ON public.messages;
CREATE POLICY "user_insert_messages"
  ON public.messages FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. agent_memories — long-term persistent memory (facts, preferences, decisions)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_memories (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id              uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  memory_type         text NOT NULL CHECK (memory_type IN ('preference', 'fact', 'decision', 'pattern', 'business_info')),
  key                 text NOT NULL,               -- Memory key (e.g., "primary_currency")
  value               text NOT NULL,               -- Memory value (e.g., "USD")
  value_json          jsonb,                       -- Structured value if needed
  embedding           vector(1536),                -- For semantic search
  source_conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  importance          integer NOT NULL DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),
  access_count        integer NOT NULL DEFAULT 0,
  last_accessed_at    timestamptz NOT NULL DEFAULT now(),
  expires_at          timestamptz,                 -- Optional expiration for temporary memories
  metadata            jsonb DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, key)
);

CREATE INDEX IF NOT EXISTS agent_memories_user_idx ON public.agent_memories (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS agent_memories_type_idx ON public.agent_memories (memory_type, updated_at DESC);
CREATE INDEX IF NOT EXISTS agent_memories_importance_idx ON public.agent_memories (importance DESC, updated_at DESC);
CREATE INDEX IF NOT EXISTS agent_memories_embedding_idx ON public.agent_memories USING ivfflat (embedding vector_cosine_ops);

ALTER TABLE public.agent_memories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_select_memories" ON public.agent_memories;
CREATE POLICY "user_select_memories"
  ON public.agent_memories FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_insert_memories" ON public.agent_memories;
CREATE POLICY "user_insert_memories"
  ON public.agent_memories FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_update_memories" ON public.agent_memories;
CREATE POLICY "user_update_memories"
  ON public.agent_memories FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_delete_memories" ON public.agent_memories;
CREATE POLICY "user_delete_memories"
  ON public.agent_memories FOR DELETE
  USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. conversation_summaries — compressed historical context for old conversations
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conversation_summaries (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id     uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id              uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  summary             text NOT NULL,               -- AI-generated concise summary
  key_points          text[],                      -- Array of key points extracted
  entities            jsonb,                       -- Named entities (tickers, amounts, dates)
  embedding           vector(1536),                -- For semantic search
  message_count       integer NOT NULL,            -- Number of messages summarized
  summary_version     integer NOT NULL DEFAULT 1,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS conversation_summaries_conversation_idx ON public.conversation_summaries (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS conversation_summaries_user_idx ON public.conversation_summaries (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS conversation_summaries_embedding_idx ON public.conversation_summaries USING ivfflat (embedding vector_cosine_ops);

ALTER TABLE public.conversation_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_select_summaries" ON public.conversation_summaries;
CREATE POLICY "user_select_summaries"
  ON public.conversation_summaries FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_insert_summaries" ON public.conversation_summaries;
CREATE POLICY "user_insert_summaries"
  ON public.conversation_summaries FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. agent_tasks — background task state (for autonomous execution)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_tasks (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id              uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id     uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  task_type           text NOT NULL,               -- e.g., "audit_monthly", "reconcile_all"
  objective           text NOT NULL,               -- Natural language objective
  status              text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  steps               jsonb DEFAULT '[]'::jsonb,    -- Planned steps
  current_step        integer DEFAULT 0,
  progress            integer DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  error_message       text,
  metadata            jsonb DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  started_at          timestamptz,
  completed_at        timestamptz
);

CREATE INDEX IF NOT EXISTS agent_tasks_user_idx ON public.agent_tasks (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS agent_tasks_status_idx ON public.agent_tasks (status, created_at DESC);
CREATE INDEX IF NOT EXISTS agent_tasks_conversation_idx ON public.agent_tasks (conversation_id);

ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_select_tasks" ON public.agent_tasks;
CREATE POLICY "user_select_tasks"
  ON public.agent_tasks FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_insert_tasks" ON public.agent_tasks;
CREATE POLICY "user_insert_tasks"
  ON public.agent_tasks FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_update_tasks" ON public.agent_tasks;
CREATE POLICY "user_update_tasks"
  ON public.agent_tasks FOR UPDATE
  USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. task_results — completed task outputs
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.task_results (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id             uuid NOT NULL REFERENCES public.agent_tasks(id) ON DELETE CASCADE,
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id              uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  result_type         text NOT NULL,               -- e.g., "report", "file", "data"
  result_data         jsonb,                       -- Structured result data
  result_text         text,                        -- Textual result
  file_path           text,                        -- Reference to stored file
  file_name           text,
  file_size           integer,
  embedding           vector(1536),                -- For semantic search
  metadata            jsonb DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS task_results_task_idx ON public.task_results (task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS task_results_user_idx ON public.task_results (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS task_results_embedding_idx ON public.task_results USING ivfflat (embedding vector_cosine_ops);

ALTER TABLE public.task_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_select_task_results" ON public.task_results;
CREATE POLICY "user_select_task_results"
  ON public.task_results FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_insert_task_results" ON public.task_results;
CREATE POLICY "user_insert_task_results"
  ON public.task_results FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Helper function: Update updated_at timestamp
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_agent_memories_updated_at ON public.agent_memories;
CREATE TRIGGER update_agent_memories_updated_at
  BEFORE UPDATE ON public.agent_memories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Helper function: Increment access_count for memories
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_memory_access()
RETURNS TRIGGER AS $$
BEGIN
  NEW.access_count = OLD.access_count + 1;
  NEW.last_accessed_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS increment_memory_access_trigger ON public.agent_memories;
CREATE TRIGGER increment_memory_access_trigger
  BEFORE UPDATE ON public.agent_memories
  FOR EACH ROW
  WHEN (OLD.access_count IS NOT NULL)
  EXECUTE FUNCTION public.increment_memory_access();

-- ─────────────────────────────────────────────────────────────────────────────
-- Done
-- ─────────────────────────────────────────────────────────────────────────────
