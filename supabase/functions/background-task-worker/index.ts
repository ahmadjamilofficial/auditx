// ─── AuditX Background Task Worker ─────────────────────────────────────────────
// Supabase Edge Function that processes background tasks
// Triggered by PostgreSQL triggers or scheduled via cron

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  try {
    // This function can be triggered by:
    // 1. HTTP request (for manual testing)
    // 2. PostgreSQL trigger (via webhook)
    // 3. Scheduled cron job

    const { method } = req;

    if (method === "POST") {
      const body = await req.json();
      const { task_id } = body;

      if (!task_id) {
        return new Response(JSON.stringify({ error: "task_id is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Get the task
      const { data: task, error: taskError } = await supabase
        .from("agent_tasks")
        .select("*")
        .eq("id", task_id)
        .single();

      if (taskError || !task) {
        return new Response(JSON.stringify({ error: "Task not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Check if task is in pending state
      if (task.status !== "pending") {
        return new Response(JSON.stringify({ error: "Task is not in pending state" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Update status to running
      await supabase
        .from("agent_tasks")
        .update({
          status: "running",
          started_at: new Date().toISOString(),
          current_step: 0,
          progress: 0,
        })
        .eq("id", task_id);

      // Execute the task
      await executeTask(task);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (method === "GET") {
      // Process all pending tasks (for cron job)
      const { data: pendingTasks } = await supabase
        .from("agent_tasks")
        .select("*")
        .eq("status", "pending")
        .limit(10);

      if (pendingTasks && pendingTasks.length > 0) {
        for (const task of pendingTasks) {
          try {
            await executeTask(task);
          } catch (error) {
            console.error(`Failed to execute task ${task.id}:`, error);
          }
        }
      }

      return new Response(JSON.stringify({ processed: pendingTasks?.length ?? 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (error) {
    console.error("Background task worker error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

async function executeTask(task: any) {
  const { id, user_id, org_id, task_type, objective, steps } = task;

  try {
    // Execute each step
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];

      // Update progress
      await supabase
        .from("agent_tasks")
        .update({
          current_step: i,
          progress: Math.round((i / steps.length) * 100),
        })
        .eq("id", id);

      // Execute the step (task-specific logic)
      await executeStep(task, step.step, i);

      // Mark step as completed
      const updatedSteps = [...steps];
      updatedSteps[i] = { ...step, status: "completed" };
      await supabase
        .from("agent_tasks")
        .update({ steps: updatedSteps })
        .eq("id", id);
    }

    // Mark task as completed
    await supabase
      .from("agent_tasks")
      .update({
        status: "completed",
        progress: 100,
        completed_at: new Date().toISOString(),
      })
      .eq("id", id);

    // Create notification
    await supabase.from("notifications").insert({
      org_id: org_id,
      user_id: user_id,
      type: "task_complete",
      title: "Task Completed",
      message: objective,
      severity: "success",
    });
  } catch (error) {
    // Mark task as failed
    await supabase
      .from("agent_tasks")
      .update({
        status: "failed",
        error_message: (error as Error).message,
      })
      .eq("id", id);

    // Create error notification
    await supabase.from("notifications").insert({
      org_id: org_id,
      user_id: user_id,
      type: "task_failed",
      title: "Task Failed",
      message: (error as Error).message,
      severity: "error",
    });

    throw error;
  }
}

async function executeStep(task: any, step: string, stepIndex: number) {
  // Implement task-specific logic here
  // This is a placeholder - you'd need to implement actual logic for each task type

  console.log(`Executing step ${stepIndex + 1}/${task.steps.length}: ${step}`);

  // Simulate work (replace with actual logic)
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Example task implementations:
  // switch (task.task_type) {
  //   case "audit_monthly":
  //     await auditMonthlyTransactions(task);
  //     break;
  //   case "generate_report":
  //     await generateFinancialReport(task);
  //     break;
  //   case "reconcile_all":
  //     await reconcileAllAccounts(task);
  //     break;
  //   default:
  //     console.log(`Unknown task type: ${task.task_type}`);
  // }
}
