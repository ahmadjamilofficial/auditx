// ─── Wab Memory Service ───────────────────────────────────────────────────────
// Implements three-level memory: working (conversation), persistent (long-term), and historical (retrieval)

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export interface Memory {
  id: string;
  user_id: string;
  org_id: string;
  memory_type: "preference" | "fact" | "decision" | "pattern" | "business_info";
  key: string;
  value: string;
  value_json?: Record<string, unknown>;
  importance: number; // 1-10
  access_count: number;
  last_accessed_at: string;
  expires_at?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ConversationSummary {
  id: string;
  conversation_id: string;
  summary: string;
  key_points: string[];
  entities: Record<string, unknown>;
  message_count: number;
  created_at: string;
}

export interface AgentTask {
  id: string;
  user_id: string;
  org_id: string;
  conversation_id?: string;
  task_type: string;
  objective: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  steps: Array<{ step: string; status: string }>;
  current_step: number;
  progress: number;
  error_message?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export class MemoryService {
  private supabase: ReturnType<typeof createClient<Database>>;

  constructor(supabaseUrl: string, supabaseKey: string, authorization?: string) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey, {
      global: authorization ? { headers: { Authorization: authorization } } : undefined,
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  // ── Working Memory (Current Conversation) ───────────────────────────────────

  /**
   * Save a message to the current conversation
   */
  async saveMessage(
    conversationId: string,
    userId: string,
    orgId: string,
    role: "user" | "assistant" | "system" | "tool",
    content: string,
    parts?: Array<{ type: string; content: string }>,
    position: number,
  ): Promise<void> {
    const { error } = await this.supabase.from("messages").insert({
      conversation_id: conversationId,
      user_id: userId,
      org_id: orgId,
      role,
      content,
      parts: parts as never,
      position,
    });

    if (error) throw new Error(`Failed to save message: ${error.message}`);
  }

  /**
   * Get recent messages from a conversation (working memory)
   */
  async getConversationMessages(
    conversationId: string,
    limit: number = 20,
  ): Promise<Array<{ role: string; content: string; parts: unknown }>> {
    const { data, error } = await this.supabase
      .from("messages")
      .select("role, content, parts")
      .eq("conversation_id", conversationId)
      .order("position", { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to get messages: ${error.message}`);
    return (data ?? []).reverse();
  }

  // ── Persistent Memory (Long-term facts, preferences, decisions) ──────────────

  /**
   * Store a persistent memory (preference, fact, decision, pattern, business_info)
   */
  async storeMemory(
    userId: string,
    orgId: string,
    memoryType: Memory["memory_type"],
    key: string,
    value: string,
    importance: number = 5,
    valueJson?: Record<string, unknown>,
    sourceConversationId?: string,
    expiresAt?: string,
  ): Promise<Memory> {
    const { data, error } = await this.supabase
      .from("agent_memories")
      .upsert(
        {
          user_id: userId,
          org_id: orgId,
          memory_type: memoryType,
          key,
          value,
          value_json: valueJson as never,
          importance,
          source_conversation_id: sourceConversationId,
          expires_at: expiresAt,
        },
        { onConflict: "user_id,key" },
      )
      .select()
      .single();

    if (error) throw new Error(`Failed to store memory: ${error.message}`);
    return data as Memory;
  }

  /**
   * Retrieve relevant memories for a user
   */
  async getMemories(
    userId: string,
    orgId: string,
    memoryType?: Memory["memory_type"],
    limit: number = 20,
  ): Promise<Memory[]> {
    let query = this.supabase
      .from("agent_memories")
      .select("*")
      .eq("user_id", userId)
      .eq("org_id", orgId);

    if (memoryType) {
      query = query.eq("memory_type", memoryType);
    }

    // Filter out expired memories
    query = query.or("expires_at.is.null,expires_at.gt.now()");

    const { data, error } = await query
      .order("importance", { ascending: false })
      .order("last_accessed_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to get memories: ${error.message}`);
    return (data ?? []) as Memory[];
  }

  /**
   * Get a specific memory by key
   */
  async getMemoryByKey(userId: string, key: string): Promise<Memory | null> {
    const { data, error } = await this.supabase
      .from("agent_memories")
      .select("*")
      .eq("user_id", userId)
      .eq("key", key)
      .maybeSingle();

    if (error) throw new Error(`Failed to get memory: ${error.message}`);
    return data as Memory | null;
  }

  /**
   * Delete a memory
   */
  async deleteMemory(userId: string, key: string): Promise<void> {
    const { error } = await this.supabase
      .from("agent_memories")
      .delete()
      .eq("user_id", userId)
      .eq("key", key);

    if (error) throw new Error(`Failed to delete memory: ${error.message}`);
  }

  /**
   * Extract and store memories from a conversation
   * This would typically be called by an AI agent after a meaningful interaction
   */
  async extractMemoriesFromConversation(
    conversationId: string,
    userId: string,
    orgId: string,
    extractedMemories: Array<{
      type: Memory["memory_type"];
      key: string;
      value: string;
      importance?: number;
      valueJson?: Record<string, unknown>;
    }>,
  ): Promise<void> {
    for (const mem of extractedMemories) {
      await this.storeMemory(
        userId,
        orgId,
        mem.type,
        mem.key,
        mem.value,
        mem.importance ?? 5,
        mem.valueJson,
        conversationId,
      );
    }
  }

  // ── Historical Memory (Retrieval from old conversations) ───────────────────

  /**
   * Summarize a conversation for historical retrieval
   */
  async summarizeConversation(
    conversationId: string,
    userId: string,
    orgId: string,
    summary: string,
    keyPoints: string[],
    entities: Record<string, unknown>,
    messageCount: number,
  ): Promise<ConversationSummary> {
    const { data, error } = await this.supabase
      .from("conversation_summaries")
      .insert({
        conversation_id: conversationId,
        user_id: userId,
        org_id: orgId,
        summary,
        key_points: keyPoints,
        entities: entities as never,
        message_count: messageCount,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to save summary: ${error.message}`);
    return data as ConversationSummary;
  }

  /**
   * Get conversation summaries for historical context
   */
  async getConversationSummaries(
    userId: string,
    orgId: string,
    limit: number = 10,
  ): Promise<ConversationSummary[]> {
    const { data, error } = await this.supabase
      .from("conversation_summaries")
      .select("*")
      .eq("user_id", userId)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to get summaries: ${error.message}`);
    return (data ?? []) as ConversationSummary[];
  }

  /**
   * Archive a conversation (moves it out of active working memory)
   */
  async archiveConversation(conversationId: string): Promise<void> {
    const { error } = await this.supabase
      .from("conversations")
      .update({ is_archived: true, archived_at: new Date().toISOString() })
      .eq("id", conversationId);

    if (error) throw new Error(`Failed to archive conversation: ${error.message}`);
  }

  // ── Background Tasks (Autonomous execution) ─────────────────────────────────

  /**
   * Create a background task
   */
  async createTask(
    userId: string,
    orgId: string,
    taskType: string,
    objective: string,
    steps: string[],
    conversationId?: string,
  ): Promise<AgentTask> {
    const { data, error } = await this.supabase
      .from("agent_tasks")
      .insert({
        user_id: userId,
        org_id: orgId,
        conversation_id: conversationId,
        task_type: taskType,
        objective,
        steps: steps.map((step) => ({ step, status: "pending" })) as never,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create task: ${error.message}`);
    return data as AgentTask;
  }

  /**
   * Update task status and progress
   */
  async updateTask(
    taskId: string,
    updates: Partial<{
      status: AgentTask["status"];
      current_step: number;
      progress: number;
      error_message: string;
      started_at: string;
      completed_at: string;
    }>,
  ): Promise<void> {
    const { error } = await this.supabase
      .from("agent_tasks")
      .update(updates as never)
      .eq("id", taskId);

    if (error) throw new Error(`Failed to update task: ${error.message}`);
  }

  /**
   * Get a task by ID
   */
  async getTask(taskId: string): Promise<AgentTask | null> {
    const { data, error } = await this.supabase
      .from("agent_tasks")
      .select("*")
      .eq("id", taskId)
      .maybeSingle();

    if (error) throw new Error(`Failed to get task: ${error.message}`);
    return data as AgentTask | null;
  }

  /**
   * Get recent tasks for a user
   */
  async getTasks(
    userId: string,
    orgId: string,
    status?: AgentTask["status"],
    limit: number = 20,
  ): Promise<AgentTask[]> {
    let query = this.supabase
      .from("agent_tasks")
      .select("*")
      .eq("user_id", userId)
      .eq("org_id", orgId);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to get tasks: ${error.message}`);
    return (data ?? []) as AgentTask[];
  }

  /**
   * Save task result
   */
  async saveTaskResult(
    taskId: string,
    userId: string,
    orgId: string,
    resultType: string,
    resultData?: Record<string, unknown>,
    resultText?: string,
    filePath?: string,
    fileName?: string,
    fileSize?: number,
  ): Promise<void> {
    const { error } = await this.supabase.from("task_results").insert({
      task_id: taskId,
      user_id: userId,
      org_id: orgId,
      result_type: resultType,
      result_data: resultData as never,
      result_text: resultText,
      file_path: filePath,
      file_name: fileName,
      file_size: fileSize,
    });

    if (error) throw new Error(`Failed to save task result: ${error.message}`);
  }

  /**
   * Get task results
   */
  async getTaskResults(taskId: string): Promise<Array<Record<string, unknown>>> {
    const { data, error } = await this.supabase
      .from("task_results")
      .select("*")
      .eq("task_id", taskId);

    if (error) throw new Error(`Failed to get task results: ${error.message}`);
    return data ?? [];
  }
}
