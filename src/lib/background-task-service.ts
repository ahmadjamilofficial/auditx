// ─── Wab Background Task Service ───────────────────────────────────────────
// Handles autonomous background task execution with retries and notifications

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { MemoryService } from "./memory-service";

export interface BackgroundTask {
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

export class BackgroundTaskService {
  private supabase: ReturnType<typeof createClient<Database>>;
  private memoryService: MemoryService;

  constructor(supabaseUrl: string, supabaseKey: string, authorization?: string) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey, {
      global: authorization ? { headers: { Authorization: authorization } } : undefined,
      auth: { persistSession: false, autoRefreshToken: false },
    });
    this.memoryService = new MemoryService(supabaseUrl, supabaseKey, authorization);
  }

  /**
   * Create a new background task
   */
  async createTask(
    userId: string,
    orgId: string,
    taskType: string,
    objective: string,
    steps: string[],
    conversationId?: string,
  ): Promise<BackgroundTask> {
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
    return data as BackgroundTask;
  }

  /**
   * Execute a task (this would be called by a background worker)
   */
  async executeTask(taskId: string): Promise<void> {
    const task = await this.getTask(taskId);
    if (!task) throw new Error("Task not found");
    if (task.status !== "pending") throw new Error("Task is not in pending state");

    // Update status to running
    await this.updateTask(taskId, {
      status: "running",
      started_at: new Date().toISOString(),
      current_step: 0,
      progress: 0,
    });

    try {
      // Execute each step
      for (let i = 0; i < task.steps.length; i++) {
        const step = task.steps[i];
        await this.updateTask(taskId, {
          current_step: i,
          progress: Math.round((i / task.steps.length) * 100),
        });

        // Execute the step (this would be task-specific logic)
        await this.executeStep(task, step.step, i);

        // Mark step as completed
        const updatedSteps = [...task.steps];
        updatedSteps[i] = { ...step, status: "completed" };
        await this.supabase
          .from("agent_tasks")
          .update({ steps: updatedSteps as never })
          .eq("id", taskId);
      }

      // Mark task as completed
      await this.updateTask(taskId, {
        status: "completed",
        progress: 100,
        completed_at: new Date().toISOString(),
      });

      // Create notification
      await this.createNotification(
        task.user_id,
        task.org_id,
        "task_complete",
        "Task Completed",
        task.objective,
      );
    } catch (error) {
      // Mark task as failed
      await this.updateTask(taskId, {
        status: "failed",
        error_message: (error as Error).message,
      });

      // Create error notification
      await this.createNotification(
        task.user_id,
        task.org_id,
        "task_failed",
        "Task Failed",
        (error as Error).message,
      );
    }
  }

  /**
   * Execute a single step (placeholder - implement task-specific logic)
   */
  private async executeStep(task: BackgroundTask, step: string, stepIndex: number): Promise<void> {
    // This is where you'd implement task-specific logic
    // For example:
    // - If task_type is "audit_monthly", fetch transactions and run reconciliation
    // - If task_type is "generate_report", compile data and create PDF
    // - If task_type is "reconcile_all", match transactions across sources

    console.log(`Executing step ${stepIndex + 1}/${task.steps.length}: ${step}`);

    // Simulate work (replace with actual logic)
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  /**
   * Get a task by ID
   */
  async getTask(taskId: string): Promise<BackgroundTask | null> {
    const { data, error } = await this.supabase
      .from("agent_tasks")
      .select("*")
      .eq("id", taskId)
      .maybeSingle();

    if (error) throw new Error(`Failed to get task: ${error.message}`);
    return data as BackgroundTask | null;
  }

  /**
   * Update task status and progress
   */
  async updateTask(
    taskId: string,
    updates: Partial<{
      status: BackgroundTask["status"];
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
   * Cancel a task
   */
  async cancelTask(taskId: string): Promise<void> {
    await this.updateTask(taskId, { status: "cancelled" });
  }

  /**
   * Get tasks for a user
   */
  async getTasks(
    userId: string,
    orgId: string,
    status?: BackgroundTask["status"],
    limit: number = 20,
  ): Promise<BackgroundTask[]> {
    let query = this.supabase
      .from("agent_tasks")
      .select("*")
      .eq("user_id", userId)
      .eq("org_id", orgId);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query.order("created_at", { ascending: false }).limit(limit);

    if (error) throw new Error(`Failed to get tasks: ${error.message}`);
    return (data ?? []) as BackgroundTask[];
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

  /**
   * Create a notification
   */
  private async createNotification(
    userId: string,
    orgId: string,
    type: string,
    title: string,
    message: string,
  ): Promise<void> {
    await this.supabase.from("notifications").insert({
      org_id: orgId,
      user_id: userId,
      type,
      title,
      message,
      severity: "info",
    });
  }

  /**
   * Retry a failed task
   */
  async retryTask(taskId: string): Promise<void> {
    const task = await this.getTask(taskId);
    if (!task) throw new Error("Task not found");
    if (task.status !== "failed") throw new Error("Task is not in failed state");

    // Reset task to pending
    await this.updateTask(taskId, {
      status: "pending",
      error_message: undefined,
      current_step: 0,
      progress: 0,
    });

    // Re-execute
    await this.executeTask(taskId);
  }
}
