export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      agent_approvals: {
        Row: {
          action_payload: Json;
          action_type: string;
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          id: string;
          job_id: string | null;
          org_id: string;
          policy_tier: string;
          run_id: string | null;
          status: string;
        };
        Insert: {
          action_payload?: Json;
          action_type: string;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          id?: string;
          job_id?: string | null;
          org_id: string;
          policy_tier?: string;
          run_id?: string | null;
          status?: string;
        };
        Update: {
          action_payload?: Json;
          action_type?: string;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          id?: string;
          job_id?: string | null;
          org_id?: string;
          policy_tier?: string;
          run_id?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agent_approvals_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "agent_jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agent_approvals_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agent_approvals_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_monthly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "agent_approvals_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_nightly";
            referencedColumns: ["org_id"];
          },
        ];
      };
      agent_jobs: {
        Row: {
          attempt_count: number;
          created_at: string;
          error_message: string | null;
          id: string;
          idempotency_key: string;
          max_attempts: number;
          next_run_at: string;
          org_id: string;
          result_summary: Json | null;
          run_id: string | null;
          status: string;
          trigger_payload: Json;
          trigger_type: string;
          updated_at: string;
        };
        Insert: {
          attempt_count?: number;
          created_at?: string;
          error_message?: string | null;
          id?: string;
          idempotency_key: string;
          max_attempts?: number;
          next_run_at?: string;
          org_id: string;
          result_summary?: Json | null;
          run_id?: string | null;
          status?: string;
          trigger_payload?: Json;
          trigger_type: string;
          updated_at?: string;
        };
        Update: {
          attempt_count?: number;
          created_at?: string;
          error_message?: string | null;
          id?: string;
          idempotency_key?: string;
          max_attempts?: number;
          next_run_at?: string;
          org_id?: string;
          result_summary?: Json | null;
          run_id?: string | null;
          status?: string;
          trigger_payload?: Json;
          trigger_type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agent_jobs_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agent_jobs_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_monthly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "agent_jobs_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_nightly";
            referencedColumns: ["org_id"];
          },
        ];
      };
      agent_memories: {
        Row: {
          access_count: number;
          created_at: string;
          embedding: string | null;
          expires_at: string | null;
          id: string;
          importance: number;
          key: string;
          last_accessed_at: string;
          memory_type: string;
          metadata: Json | null;
          org_id: string;
          source_conversation_id: string | null;
          updated_at: string;
          user_id: string;
          value: string;
          value_json: Json | null;
        };
        Insert: {
          access_count?: number;
          created_at?: string;
          embedding?: string | null;
          expires_at?: string | null;
          id?: string;
          importance?: number;
          key: string;
          last_accessed_at?: string;
          memory_type: string;
          metadata?: Json | null;
          org_id: string;
          source_conversation_id?: string | null;
          updated_at?: string;
          user_id: string;
          value: string;
          value_json?: Json | null;
        };
        Update: {
          access_count?: number;
          created_at?: string;
          embedding?: string | null;
          expires_at?: string | null;
          id?: string;
          importance?: number;
          key?: string;
          last_accessed_at?: string;
          memory_type?: string;
          metadata?: Json | null;
          org_id?: string;
          source_conversation_id?: string | null;
          updated_at?: string;
          user_id?: string;
          value?: string;
          value_json?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "agent_memories_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agent_memories_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_monthly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "agent_memories_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_nightly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "agent_memories_source_conversation_id_fkey";
            columns: ["source_conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      agent_tasks: {
        Row: {
          completed_at: string | null;
          conversation_id: string | null;
          created_at: string;
          current_step: number | null;
          error_message: string | null;
          id: string;
          metadata: Json | null;
          objective: string;
          org_id: string;
          progress: number | null;
          started_at: string | null;
          status: string;
          steps: Json | null;
          task_type: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          conversation_id?: string | null;
          created_at?: string;
          current_step?: number | null;
          error_message?: string | null;
          id?: string;
          metadata?: Json | null;
          objective: string;
          org_id: string;
          progress?: number | null;
          started_at?: string | null;
          status?: string;
          steps?: Json | null;
          task_type: string;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          conversation_id?: string | null;
          created_at?: string;
          current_step?: number | null;
          error_message?: string | null;
          id?: string;
          metadata?: Json | null;
          objective?: string;
          org_id?: string;
          progress?: number | null;
          started_at?: string | null;
          status?: string;
          steps?: Json | null;
          task_type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agent_tasks_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agent_tasks_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agent_tasks_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_monthly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "agent_tasks_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_nightly";
            referencedColumns: ["org_id"];
          },
        ];
      };
      ai_plan_limits: {
        Row: {
          daily_credits: number;
          max_per_request: number;
          monthly_credits: number;
          plan: string;
        };
        Insert: {
          daily_credits: number;
          max_per_request: number;
          monthly_credits: number;
          plan: string;
        };
        Update: {
          daily_credits?: number;
          max_per_request?: number;
          monthly_credits?: number;
          plan?: string;
        };
        Relationships: [];
      };
      ai_usage: {
        Row: {
          created_at: string;
          credits_used: number;
          id: string;
          inference_requests: number;
          model: string;
          org_id: string;
          plan: string;
          provider_error: string | null;
          status: string;
          thread_id: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          credits_used?: number;
          id?: string;
          inference_requests?: number;
          model?: string;
          org_id: string;
          plan?: string;
          provider_error?: string | null;
          status?: string;
          thread_id?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          credits_used?: number;
          id?: string;
          inference_requests?: number;
          model?: string;
          org_id?: string;
          plan?: string;
          provider_error?: string | null;
          status?: string;
          thread_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_usage_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_usage_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_monthly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "ai_usage_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_nightly";
            referencedColumns: ["org_id"];
          },
        ];
      };
      audit_log: {
        Row: {
          action: string;
          actor: string;
          created_at: string;
          entity_id: string;
          entity_type: string;
          hash: string;
          id: string;
          org_id: string;
          payload: Json;
          policy_tier: string | null;
          prev_hash: string;
          run_id: string | null;
        };
        Insert: {
          action: string;
          actor: string;
          created_at?: string;
          entity_id: string;
          entity_type: string;
          hash: string;
          id?: string;
          org_id: string;
          payload?: Json;
          policy_tier?: string | null;
          prev_hash?: string;
          run_id?: string | null;
        };
        Update: {
          action?: string;
          actor?: string;
          created_at?: string;
          entity_id?: string;
          entity_type?: string;
          hash?: string;
          id?: string;
          org_id?: string;
          payload?: Json;
          policy_tier?: string | null;
          prev_hash?: string;
          run_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_log_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_log_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_monthly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "audit_log_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_nightly";
            referencedColumns: ["org_id"];
          },
        ];
      };
      broker_accounts: {
        Row: {
          broker_name: string;
          created_at: string;
          currency: string;
          exchange: string;
          external_ref: string | null;
          id: string;
          name: string;
          org_id: string;
        };
        Insert: {
          broker_name: string;
          created_at?: string;
          currency?: string;
          exchange?: string;
          external_ref?: string | null;
          id?: string;
          name: string;
          org_id: string;
        };
        Update: {
          broker_name?: string;
          created_at?: string;
          currency?: string;
          exchange?: string;
          external_ref?: string | null;
          id?: string;
          name?: string;
          org_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "broker_accounts_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "broker_accounts_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_monthly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "broker_accounts_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_nightly";
            referencedColumns: ["org_id"];
          },
        ];
      };
      chat_messages: {
        Row: {
          ai_message_id: string;
          created_at: string;
          id: string;
          org_id: string;
          parts: Json;
          position: number;
          role: string;
          thread_id: string;
          user_id: string;
        };
        Insert: {
          ai_message_id: string;
          created_at?: string;
          id?: string;
          org_id: string;
          parts?: Json;
          position: number;
          role: string;
          thread_id: string;
          user_id: string;
        };
        Update: {
          ai_message_id?: string;
          created_at?: string;
          id?: string;
          org_id?: string;
          parts?: Json;
          position?: number;
          role?: string;
          thread_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_messages_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_messages_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_monthly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "chat_messages_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_nightly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "chat_messages_thread_id_fkey";
            columns: ["thread_id"];
            isOneToOne: false;
            referencedRelation: "chat_threads";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_threads: {
        Row: {
          created_at: string;
          id: string;
          org_id: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          org_id: string;
          title?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          org_id?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_threads_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_threads_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_monthly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "chat_threads_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_nightly";
            referencedColumns: ["org_id"];
          },
        ];
      };
      connected_sources: {
        Row: {
          created_at: string;
          display_name: string;
          external_id: string;
          id: string;
          last_etag: string | null;
          last_hash: string | null;
          last_synced_at: string | null;
          oauth_token_encrypted: string | null;
          org_id: string;
          paused: boolean;
          rules: Json;
          source_type: string;
          updated_at: string;
          watch_expiry: string | null;
        };
        Insert: {
          created_at?: string;
          display_name: string;
          external_id: string;
          id?: string;
          last_etag?: string | null;
          last_hash?: string | null;
          last_synced_at?: string | null;
          oauth_token_encrypted?: string | null;
          org_id: string;
          paused?: boolean;
          rules?: Json;
          source_type: string;
          updated_at?: string;
          watch_expiry?: string | null;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          external_id?: string;
          id?: string;
          last_etag?: string | null;
          last_hash?: string | null;
          last_synced_at?: string | null;
          oauth_token_encrypted?: string | null;
          org_id?: string;
          paused?: boolean;
          rules?: Json;
          source_type?: string;
          updated_at?: string;
          watch_expiry?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "connected_sources_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "connected_sources_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_monthly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "connected_sources_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_nightly";
            referencedColumns: ["org_id"];
          },
        ];
      };
      conversation_summaries: {
        Row: {
          conversation_id: string;
          created_at: string;
          embedding: string | null;
          entities: Json | null;
          id: string;
          key_points: string[] | null;
          message_count: number;
          org_id: string;
          summary: string;
          summary_version: number;
          user_id: string;
        };
        Insert: {
          conversation_id: string;
          created_at?: string;
          embedding?: string | null;
          entities?: Json | null;
          id?: string;
          key_points?: string[] | null;
          message_count: number;
          org_id: string;
          summary: string;
          summary_version?: number;
          user_id: string;
        };
        Update: {
          conversation_id?: string;
          created_at?: string;
          embedding?: string | null;
          entities?: Json | null;
          id?: string;
          key_points?: string[] | null;
          message_count?: number;
          org_id?: string;
          summary?: string;
          summary_version?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_summaries_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_summaries_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_summaries_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_monthly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "conversation_summaries_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_nightly";
            referencedColumns: ["org_id"];
          },
        ];
      };
      conversations: {
        Row: {
          archived_at: string | null;
          context_summary: Json | null;
          created_at: string;
          embedding: string | null;
          id: string;
          is_archived: boolean;
          metadata: Json | null;
          org_id: string;
          summary: string | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          archived_at?: string | null;
          context_summary?: Json | null;
          created_at?: string;
          embedding?: string | null;
          id?: string;
          is_archived?: boolean;
          metadata?: Json | null;
          org_id: string;
          summary?: string | null;
          title?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          archived_at?: string | null;
          context_summary?: Json | null;
          created_at?: string;
          embedding?: string | null;
          id?: string;
          is_archived?: boolean;
          metadata?: Json | null;
          org_id?: string;
          summary?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_monthly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "conversations_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_nightly";
            referencedColumns: ["org_id"];
          },
        ];
      };
      documents: {
        Row: {
          broker_account_id: string | null;
          confidence_score: number | null;
          created_at: string;
          doc_type: string;
          extracted_data: Json | null;
          id: string;
          org_id: string;
          status: string;
          storage_path: string;
          uploaded_by: string;
        };
        Insert: {
          broker_account_id?: string | null;
          confidence_score?: number | null;
          created_at?: string;
          doc_type?: string;
          extracted_data?: Json | null;
          id?: string;
          org_id: string;
          status?: string;
          storage_path: string;
          uploaded_by: string;
        };
        Update: {
          broker_account_id?: string | null;
          confidence_score?: number | null;
          created_at?: string;
          doc_type?: string;
          extracted_data?: Json | null;
          id?: string;
          org_id?: string;
          status?: string;
          storage_path?: string;
          uploaded_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documents_broker_account_id_fkey";
            columns: ["broker_account_id"];
            isOneToOne: false;
            referencedRelation: "broker_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_monthly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "documents_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_nightly";
            referencedColumns: ["org_id"];
          },
        ];
      };
      financial_events: {
        Row: {
          confidence: number;
          created_at: string;
          description: string;
          entity_id: string | null;
          entity_type: string | null;
          event_type: string;
          id: string;
          metadata: Json | null;
          org_id: string;
          resolved_at: string | null;
          severity: string;
          status: string;
          title: string;
        };
        Insert: {
          confidence?: number;
          created_at?: string;
          description: string;
          entity_id?: string | null;
          entity_type?: string | null;
          event_type: string;
          id?: string;
          metadata?: Json | null;
          org_id: string;
          resolved_at?: string | null;
          severity?: string;
          status?: string;
          title: string;
        };
        Update: {
          confidence?: number;
          created_at?: string;
          description?: string;
          entity_id?: string | null;
          entity_type?: string | null;
          event_type?: string;
          id?: string;
          metadata?: Json | null;
          org_id?: string;
          resolved_at?: string | null;
          severity?: string;
          status?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "financial_events_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "financial_events_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_monthly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "financial_events_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_nightly";
            referencedColumns: ["org_id"];
          },
        ];
      };
      financial_insights: {
        Row: {
          confidence: number;
          created_at: string;
          entity_ids: string[] | null;
          evidence_ids: string[] | null;
          expires_at: string | null;
          id: string;
          insight_type: string;
          org_id: string;
          resolved_at: string | null;
          severity: string;
          status: string;
          summary: string;
          title: string;
        };
        Insert: {
          confidence?: number;
          created_at?: string;
          entity_ids?: string[] | null;
          evidence_ids?: string[] | null;
          expires_at?: string | null;
          id?: string;
          insight_type: string;
          org_id: string;
          resolved_at?: string | null;
          severity?: string;
          status?: string;
          summary: string;
          title: string;
        };
        Update: {
          confidence?: number;
          created_at?: string;
          entity_ids?: string[] | null;
          evidence_ids?: string[] | null;
          expires_at?: string | null;
          id?: string;
          insight_type?: string;
          org_id?: string;
          resolved_at?: string | null;
          severity?: string;
          status?: string;
          summary?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "financial_insights_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "financial_insights_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_monthly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "financial_insights_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_nightly";
            referencedColumns: ["org_id"];
          },
        ];
      };
      financial_investigations: {
        Row: {
          completed_at: string | null;
          created_at: string;
          documents_analysed: number;
          findings: Json | null;
          id: string;
          investigation_type: string;
          org_id: string;
          scope: Json | null;
          status: string;
          summary: string | null;
          title: string;
          transactions_analysed: number;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          documents_analysed?: number;
          findings?: Json | null;
          id?: string;
          investigation_type: string;
          org_id: string;
          scope?: Json | null;
          status?: string;
          summary?: string | null;
          title: string;
          transactions_analysed?: number;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          documents_analysed?: number;
          findings?: Json | null;
          id?: string;
          investigation_type?: string;
          org_id?: string;
          scope?: Json | null;
          status?: string;
          summary?: string | null;
          title?: string;
          transactions_analysed?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "financial_investigations_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "financial_investigations_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_monthly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "financial_investigations_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_nightly";
            referencedColumns: ["org_id"];
          },
        ];
      };
      integration_audit: {
        Row: {
          action: string;
          actor_id: string | null;
          connection_id: string | null;
          created_at: string;
          detail: Json;
          id: number;
          org_id: string;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          connection_id?: string | null;
          created_at?: string;
          detail?: Json;
          id?: number;
          org_id: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          connection_id?: string | null;
          created_at?: string;
          detail?: Json;
          id?: number;
          org_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "integration_audit_connection_id_fkey";
            columns: ["connection_id"];
            isOneToOne: false;
            referencedRelation: "provider_connections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "integration_audit_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "integration_audit_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_monthly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "integration_audit_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_nightly";
            referencedColumns: ["org_id"];
          },
        ];
      };
      ledger_entries: {
        Row: {
          amount: number;
          balance_after: number;
          broker_account_id: string | null;
          created_at: string;
          entry_type: string;
          id: string;
          org_id: string;
          transaction_id: string | null;
        };
        Insert: {
          amount: number;
          balance_after?: number;
          broker_account_id?: string | null;
          created_at?: string;
          entry_type: string;
          id?: string;
          org_id: string;
          transaction_id?: string | null;
        };
        Update: {
          amount?: number;
          balance_after?: number;
          broker_account_id?: string | null;
          created_at?: string;
          entry_type?: string;
          id?: string;
          org_id?: string;
          transaction_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ledger_entries_broker_account_id_fkey";
            columns: ["broker_account_id"];
            isOneToOne: false;
            referencedRelation: "broker_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ledger_entries_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ledger_entries_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_monthly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "ledger_entries_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_nightly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "ledger_entries_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          content: string;
          conversation_id: string;
          created_at: string;
          embedding: string | null;
          id: string;
          metadata: Json | null;
          org_id: string;
          parts: Json | null;
          position: number;
          role: string;
          tool_call_id: string | null;
          tool_calls: Json | null;
          user_id: string;
        };
        Insert: {
          content: string;
          conversation_id: string;
          created_at?: string;
          embedding?: string | null;
          id?: string;
          metadata?: Json | null;
          org_id: string;
          parts?: Json | null;
          position: number;
          role: string;
          tool_call_id?: string | null;
          tool_calls?: Json | null;
          user_id: string;
        };
        Update: {
          content?: string;
          conversation_id?: string;
          created_at?: string;
          embedding?: string | null;
          id?: string;
          metadata?: Json | null;
          org_id?: string;
          parts?: Json | null;
          position?: number;
          role?: string;
          tool_call_id?: string | null;
          tool_calls?: Json | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_monthly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "messages_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_nightly";
            referencedColumns: ["org_id"];
          },
        ];
      };
      notification_prefs: {
        Row: {
          created_at: string;
          email_notify: boolean;
          email_on_auto: boolean;
          email_on_notify: boolean;
          email_on_review: boolean;
          email_on_stop: boolean;
          id: string;
          org_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          email_notify?: boolean;
          email_on_auto?: boolean;
          email_on_notify?: boolean;
          email_on_review?: boolean;
          email_on_stop?: boolean;
          id?: string;
          org_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          email_notify?: boolean;
          email_on_auto?: boolean;
          email_on_notify?: boolean;
          email_on_review?: boolean;
          email_on_stop?: boolean;
          id?: string;
          org_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_prefs_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notification_prefs_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_monthly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "notification_prefs_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_nightly";
            referencedColumns: ["org_id"];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string;
          id: string;
          link: string | null;
          message: string;
          metadata: Json | null;
          org_id: string;
          read: boolean;
          severity: string;
          title: string;
          type: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          link?: string | null;
          message: string;
          metadata?: Json | null;
          org_id: string;
          read?: boolean;
          severity?: string;
          title?: string;
          type: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          link?: string | null;
          message?: string;
          metadata?: Json | null;
          org_id?: string;
          read?: boolean;
          severity?: string;
          title?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_monthly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "notifications_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_nightly";
            referencedColumns: ["org_id"];
          },
        ];
      };
      org_feature_flags: {
        Row: {
          autonomous_agent: boolean;
          created_at: string;
          id: string;
          max_connected_sources: number;
          org_id: string;
        };
        Insert: {
          autonomous_agent?: boolean;
          created_at?: string;
          id?: string;
          max_connected_sources?: number;
          org_id: string;
        };
        Update: {
          autonomous_agent?: boolean;
          created_at?: string;
          id?: string;
          max_connected_sources?: number;
          org_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "org_feature_flags_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: true;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "org_feature_flags_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: true;
            referencedRelation: "orgs_needing_monthly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "org_feature_flags_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: true;
            referencedRelation: "orgs_needing_nightly";
            referencedColumns: ["org_id"];
          },
        ];
      };
      org_policy_config: {
        Row: {
          allowed_auto_actions: string[];
          auto_fix_duplicate_under_amount: number | null;
          confidence_threshold_auto: number;
          confidence_threshold_notify: number;
          created_at: string;
          daily_cost_budget_usd: number | null;
          daily_token_budget: number | null;
          id: string;
          never_touch_closed_periods_before: string | null;
          org_id: string;
          updated_at: string;
        };
        Insert: {
          allowed_auto_actions?: string[];
          auto_fix_duplicate_under_amount?: number | null;
          confidence_threshold_auto?: number;
          confidence_threshold_notify?: number;
          created_at?: string;
          daily_cost_budget_usd?: number | null;
          daily_token_budget?: number | null;
          id?: string;
          never_touch_closed_periods_before?: string | null;
          org_id: string;
          updated_at?: string;
        };
        Update: {
          allowed_auto_actions?: string[];
          auto_fix_duplicate_under_amount?: number | null;
          confidence_threshold_auto?: number;
          confidence_threshold_notify?: number;
          created_at?: string;
          daily_cost_budget_usd?: number | null;
          daily_token_budget?: number | null;
          id?: string;
          never_touch_closed_periods_before?: string | null;
          org_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "org_policy_config_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: true;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "org_policy_config_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: true;
            referencedRelation: "orgs_needing_monthly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "org_policy_config_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: true;
            referencedRelation: "orgs_needing_nightly";
            referencedColumns: ["org_id"];
          },
        ];
      };
      organizations: {
        Row: {
          created_at: string;
          id: string;
          jurisdiction_default: string;
          logo_url: string | null;
          name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          jurisdiction_default?: string;
          logo_url?: string | null;
          name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          jurisdiction_default?: string;
          logo_url?: string | null;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      plan_pricing: {
        Row: {
          created_at: string;
          features: Json;
          kelviq_plan_id: string;
          monthly_price: number;
          name: string;
          plan: string;
          trial_days: number;
          yearly_price: number;
        };
        Insert: {
          created_at?: string;
          features?: Json;
          kelviq_plan_id: string;
          monthly_price: number;
          name: string;
          plan: string;
          trial_days?: number;
          yearly_price: number;
        };
        Update: {
          created_at?: string;
          features?: Json;
          kelviq_plan_id?: string;
          monthly_price?: number;
          name?: string;
          plan?: string;
          trial_days?: number;
          yearly_price?: number;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string;
          id: string;
          org_id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          full_name?: string;
          id?: string;
          org_id: string;
          role?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          full_name?: string;
          id?: string;
          org_id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_monthly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "profiles_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_nightly";
            referencedColumns: ["org_id"];
          },
        ];
      };
      provider_accounts: {
        Row: {
          account_type: string;
          as_of: string;
          available: number | null;
          balance: number | null;
          connection_id: string;
          created_at: string;
          currency: string;
          external_id: string;
          id: string;
          org_id: string;
          raw: Json;
          source_ref: string | null;
          updated_at: string;
        };
        Insert: {
          account_type?: string;
          as_of?: string;
          available?: number | null;
          balance?: number | null;
          connection_id: string;
          created_at?: string;
          currency?: string;
          external_id: string;
          id?: string;
          org_id: string;
          raw?: Json;
          source_ref?: string | null;
          updated_at?: string;
        };
        Update: {
          account_type?: string;
          as_of?: string;
          available?: number | null;
          balance?: number | null;
          connection_id?: string;
          created_at?: string;
          currency?: string;
          external_id?: string;
          id?: string;
          org_id?: string;
          raw?: Json;
          source_ref?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "provider_accounts_connection_id_fkey";
            columns: ["connection_id"];
            isOneToOne: false;
            referencedRelation: "provider_connections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "provider_accounts_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "provider_accounts_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_monthly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "provider_accounts_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_nightly";
            referencedColumns: ["org_id"];
          },
        ];
      };
      provider_connections: {
        Row: {
          category: string;
          config: Json;
          consecutive_errors: number;
          created_at: string;
          created_by: string | null;
          credentials_set: boolean;
          id: string;
          label: string;
          last_error: string | null;
          last_error_at: string | null;
          last_sync_at: string | null;
          last_sync_status: string | null;
          org_id: string;
          permissions: Json;
          provider: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          category: string;
          config?: Json;
          consecutive_errors?: number;
          created_at?: string;
          created_by?: string | null;
          credentials_set?: boolean;
          id?: string;
          label: string;
          last_error?: string | null;
          last_error_at?: string | null;
          last_sync_at?: string | null;
          last_sync_status?: string | null;
          org_id: string;
          permissions?: Json;
          provider: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          category?: string;
          config?: Json;
          consecutive_errors?: number;
          created_at?: string;
          created_by?: string | null;
          credentials_set?: boolean;
          id?: string;
          label?: string;
          last_error?: string | null;
          last_error_at?: string | null;
          last_sync_at?: string | null;
          last_sync_status?: string | null;
          org_id?: string;
          permissions?: Json;
          provider?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "provider_connections_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "provider_connections_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_monthly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "provider_connections_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_nightly";
            referencedColumns: ["org_id"];
          },
        ];
      };
      provider_credentials: {
        Row: {
          auth_tag: string;
          ciphertext: string;
          connection_id: string;
          created_at: string;
          iv: string;
          key_version: number;
          org_id: string;
          rotated_at: string | null;
          updated_at: string;
        };
        Insert: {
          auth_tag: string;
          ciphertext: string;
          connection_id: string;
          created_at?: string;
          iv: string;
          key_version?: number;
          org_id: string;
          rotated_at?: string | null;
          updated_at?: string;
        };
        Update: {
          auth_tag?: string;
          ciphertext?: string;
          connection_id?: string;
          created_at?: string;
          iv?: string;
          key_version?: number;
          org_id?: string;
          rotated_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "provider_credentials_connection_id_fkey";
            columns: ["connection_id"];
            isOneToOne: true;
            referencedRelation: "provider_connections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "provider_credentials_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "provider_credentials_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_monthly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "provider_credentials_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_nightly";
            referencedColumns: ["org_id"];
          },
        ];
      };
      provider_events: {
        Row: {
          attempts: number;
          connection_id: string | null;
          id: string;
          idempotency_key: string;
          kind: string;
          last_error: string | null;
          org_id: string;
          payload: Json;
          processed_at: string | null;
          provider: string;
          received_at: string;
          signature_ok: boolean | null;
        };
        Insert: {
          attempts?: number;
          connection_id?: string | null;
          id?: string;
          idempotency_key: string;
          kind: string;
          last_error?: string | null;
          org_id: string;
          payload?: Json;
          processed_at?: string | null;
          provider: string;
          received_at?: string;
          signature_ok?: boolean | null;
        };
        Update: {
          attempts?: number;
          connection_id?: string | null;
          id?: string;
          idempotency_key?: string;
          kind?: string;
          last_error?: string | null;
          org_id?: string;
          payload?: Json;
          processed_at?: string | null;
          provider?: string;
          received_at?: string;
          signature_ok?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "provider_events_connection_id_fkey";
            columns: ["connection_id"];
            isOneToOne: false;
            referencedRelation: "provider_connections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "provider_events_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "provider_events_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_monthly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "provider_events_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_nightly";
            referencedColumns: ["org_id"];
          },
        ];
      };
      provider_sync_runs: {
        Row: {
          accounts_upserted: number;
          connection_id: string;
          error: string | null;
          finished_at: string | null;
          id: string;
          metadata: Json;
          org_id: string;
          request_id: string | null;
          started_at: string;
          status: string;
          transactions_skipped: number;
          transactions_upserted: number;
          trigger: string;
        };
        Insert: {
          accounts_upserted?: number;
          connection_id: string;
          error?: string | null;
          finished_at?: string | null;
          id?: string;
          metadata?: Json;
          org_id: string;
          request_id?: string | null;
          started_at?: string;
          status?: string;
          transactions_skipped?: number;
          transactions_upserted?: number;
          trigger?: string;
        };
        Update: {
          accounts_upserted?: number;
          connection_id?: string;
          error?: string | null;
          finished_at?: string | null;
          id?: string;
          metadata?: Json;
          org_id?: string;
          request_id?: string | null;
          started_at?: string;
          status?: string;
          transactions_skipped?: number;
          transactions_upserted?: number;
          trigger?: string;
        };
        Relationships: [
          {
            foreignKeyName: "provider_sync_runs_connection_id_fkey";
            columns: ["connection_id"];
            isOneToOne: false;
            referencedRelation: "provider_connections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "provider_sync_runs_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "provider_sync_runs_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_monthly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "provider_sync_runs_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_nightly";
            referencedColumns: ["org_id"];
          },
        ];
      };
      provider_transactions: {
        Row: {
          account_external_id: string | null;
          amount: number | null;
          connection_id: string;
          created_at: string;
          currency: string;
          dedupe_key: string;
          external_id: string;
          fees: number;
          id: string;
          instrument: string | null;
          kind: string;
          occurred_at: string;
          org_id: string;
          price: number | null;
          quantity: number | null;
          raw: Json;
          settled_at: string | null;
          side: string | null;
          source_ref: string | null;
          updated_at: string;
        };
        Insert: {
          account_external_id?: string | null;
          amount?: number | null;
          connection_id: string;
          created_at?: string;
          currency?: string;
          dedupe_key: string;
          external_id: string;
          fees?: number;
          id?: string;
          instrument?: string | null;
          kind?: string;
          occurred_at: string;
          org_id: string;
          price?: number | null;
          quantity?: number | null;
          raw?: Json;
          settled_at?: string | null;
          side?: string | null;
          source_ref?: string | null;
          updated_at?: string;
        };
        Update: {
          account_external_id?: string | null;
          amount?: number | null;
          connection_id?: string;
          created_at?: string;
          currency?: string;
          dedupe_key?: string;
          external_id?: string;
          fees?: number;
          id?: string;
          instrument?: string | null;
          kind?: string;
          occurred_at?: string;
          org_id?: string;
          price?: number | null;
          quantity?: number | null;
          raw?: Json;
          settled_at?: string | null;
          side?: string | null;
          source_ref?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "provider_transactions_connection_id_fkey";
            columns: ["connection_id"];
            isOneToOne: false;
            referencedRelation: "provider_connections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "provider_transactions_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "provider_transactions_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_monthly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "provider_transactions_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_nightly";
            referencedColumns: ["org_id"];
          },
        ];
      };
      reconciliation_flags: {
        Row: {
          actual: Json;
          broker_account_id: string | null;
          created_at: string;
          description: string;
          expected: Json;
          flag_type: string;
          id: string;
          org_id: string;
          ref_id: string;
          severity: string;
          status: string;
          suggested_resolution: string;
          ticker: string;
        };
        Insert: {
          actual?: Json;
          broker_account_id?: string | null;
          created_at?: string;
          description?: string;
          expected?: Json;
          flag_type: string;
          id?: string;
          org_id: string;
          ref_id?: string;
          severity?: string;
          status?: string;
          suggested_resolution?: string;
          ticker?: string;
        };
        Update: {
          actual?: Json;
          broker_account_id?: string | null;
          created_at?: string;
          description?: string;
          expected?: Json;
          flag_type?: string;
          id?: string;
          org_id?: string;
          ref_id?: string;
          severity?: string;
          status?: string;
          suggested_resolution?: string;
          ticker?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reconciliation_flags_broker_account_id_fkey";
            columns: ["broker_account_id"];
            isOneToOne: false;
            referencedRelation: "broker_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reconciliation_flags_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reconciliation_flags_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_monthly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "reconciliation_flags_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_nightly";
            referencedColumns: ["org_id"];
          },
        ];
      };
      subscription_events: {
        Row: {
          created_at: string;
          error_message: string | null;
          event_data: Json;
          event_type: string;
          id: string;
          kelviq_event_id: string | null;
          org_id: string | null;
          processed: boolean;
          processed_at: string | null;
          subscription_id: string | null;
        };
        Insert: {
          created_at?: string;
          error_message?: string | null;
          event_data: Json;
          event_type: string;
          id?: string;
          kelviq_event_id?: string | null;
          org_id?: string | null;
          processed?: boolean;
          processed_at?: string | null;
          subscription_id?: string | null;
        };
        Update: {
          created_at?: string;
          error_message?: string | null;
          event_data?: Json;
          event_type?: string;
          id?: string;
          kelviq_event_id?: string | null;
          org_id?: string | null;
          processed?: boolean;
          processed_at?: string | null;
          subscription_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "subscription_events_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscription_events_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_monthly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "subscription_events_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_nightly";
            referencedColumns: ["org_id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean;
          cancelled_at: string | null;
          charge_period: string;
          created_at: string;
          current_period_end: string | null;
          id: string;
          kelviq_customer_id: string | null;
          kelviq_subscription_id: string | null;
          metadata: Json | null;
          org_id: string;
          plan: string;
          status: string;
          trial_end_at: string | null;
          updated_at: string;
        };
        Insert: {
          cancel_at_period_end?: boolean;
          cancelled_at?: string | null;
          charge_period?: string;
          created_at?: string;
          current_period_end?: string | null;
          id?: string;
          kelviq_customer_id?: string | null;
          kelviq_subscription_id?: string | null;
          metadata?: Json | null;
          org_id: string;
          plan: string;
          status?: string;
          trial_end_at?: string | null;
          updated_at?: string;
        };
        Update: {
          cancel_at_period_end?: boolean;
          cancelled_at?: string | null;
          charge_period?: string;
          created_at?: string;
          current_period_end?: string | null;
          id?: string;
          kelviq_customer_id?: string | null;
          kelviq_subscription_id?: string | null;
          metadata?: Json | null;
          org_id?: string;
          plan?: string;
          status?: string;
          trial_end_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_monthly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "subscriptions_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_nightly";
            referencedColumns: ["org_id"];
          },
        ];
      };
      task_results: {
        Row: {
          created_at: string;
          embedding: string | null;
          file_name: string | null;
          file_path: string | null;
          file_size: number | null;
          id: string;
          metadata: Json | null;
          org_id: string;
          result_data: Json | null;
          result_text: string | null;
          result_type: string;
          task_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          embedding?: string | null;
          file_name?: string | null;
          file_path?: string | null;
          file_size?: number | null;
          id?: string;
          metadata?: Json | null;
          org_id: string;
          result_data?: Json | null;
          result_text?: string | null;
          result_type: string;
          task_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          embedding?: string | null;
          file_name?: string | null;
          file_path?: string | null;
          file_size?: number | null;
          id?: string;
          metadata?: Json | null;
          org_id?: string;
          result_data?: Json | null;
          result_text?: string | null;
          result_type?: string;
          task_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "task_results_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_results_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_monthly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "task_results_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_nightly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "task_results_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "agent_tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      tax_computations: {
        Row: {
          breakdown: Json;
          computed_at: string;
          dividend_wht: number;
          estimated_tax_due: number;
          filer_status: string;
          id: string;
          jurisdiction: string;
          long_term_gain: number;
          org_id: string;
          short_term_gain: number;
          tax_profile_id: string | null;
          tax_year: string;
        };
        Insert: {
          breakdown?: Json;
          computed_at?: string;
          dividend_wht?: number;
          estimated_tax_due?: number;
          filer_status?: string;
          id?: string;
          jurisdiction?: string;
          long_term_gain?: number;
          org_id: string;
          short_term_gain?: number;
          tax_profile_id?: string | null;
          tax_year: string;
        };
        Update: {
          breakdown?: Json;
          computed_at?: string;
          dividend_wht?: number;
          estimated_tax_due?: number;
          filer_status?: string;
          id?: string;
          jurisdiction?: string;
          long_term_gain?: number;
          org_id?: string;
          short_term_gain?: number;
          tax_profile_id?: string | null;
          tax_year?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tax_computations_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tax_computations_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_monthly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "tax_computations_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_nightly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "tax_computations_tax_profile_id_fkey";
            columns: ["tax_profile_id"];
            isOneToOne: false;
            referencedRelation: "tax_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      tax_loss_harvest_suggestions: {
        Row: {
          created_at: string;
          exchange: string;
          holding_days: number;
          id: string;
          org_id: string;
          position_ticker: string;
          potential_offset: number;
          rationale: string;
          status: string;
          unrealized_loss: number;
        };
        Insert: {
          created_at?: string;
          exchange?: string;
          holding_days?: number;
          id?: string;
          org_id: string;
          position_ticker: string;
          potential_offset: number;
          rationale?: string;
          status?: string;
          unrealized_loss: number;
        };
        Update: {
          created_at?: string;
          exchange?: string;
          holding_days?: number;
          id?: string;
          org_id?: string;
          position_ticker?: string;
          potential_offset?: number;
          rationale?: string;
          status?: string;
          unrealized_loss?: number;
        };
        Relationships: [
          {
            foreignKeyName: "tax_loss_harvest_suggestions_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tax_loss_harvest_suggestions_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_monthly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "tax_loss_harvest_suggestions_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_nightly";
            referencedColumns: ["org_id"];
          },
        ];
      };
      tax_profiles: {
        Row: {
          cgt_rules: Json;
          created_at: string;
          filer_status: string;
          holding_period_tiers: Json;
          id: string;
          jurisdiction: string;
          org_id: string;
          wht_rules: Json;
        };
        Insert: {
          cgt_rules?: Json;
          created_at?: string;
          filer_status?: string;
          holding_period_tiers?: Json;
          id?: string;
          jurisdiction: string;
          org_id: string;
          wht_rules?: Json;
        };
        Update: {
          cgt_rules?: Json;
          created_at?: string;
          filer_status?: string;
          holding_period_tiers?: Json;
          id?: string;
          jurisdiction?: string;
          org_id?: string;
          wht_rules?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "tax_profiles_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tax_profiles_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_monthly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "tax_profiles_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_nightly";
            referencedColumns: ["org_id"];
          },
        ];
      };
      transaction_versions: {
        Row: {
          created_at: string;
          id: string;
          org_id: string;
          policy_tier: string;
          revert_of: string | null;
          run_id: string | null;
          snapshot: Json;
          source_provenance: Json;
          transaction_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          org_id: string;
          policy_tier: string;
          revert_of?: string | null;
          run_id?: string | null;
          snapshot: Json;
          source_provenance?: Json;
          transaction_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          org_id?: string;
          policy_tier?: string;
          revert_of?: string | null;
          run_id?: string | null;
          snapshot?: Json;
          source_provenance?: Json;
          transaction_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transaction_versions_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transaction_versions_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_monthly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "transaction_versions_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_nightly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "transaction_versions_revert_of_fkey";
            columns: ["revert_of"];
            isOneToOne: false;
            referencedRelation: "transaction_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transaction_versions_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          },
        ];
      };
      transactions: {
        Row: {
          action: string;
          broker: string;
          broker_account_id: string | null;
          confidence_score: number;
          created_at: string;
          document_id: string | null;
          exchange: string;
          fees: number;
          id: string;
          notes: string | null;
          org_id: string;
          price: number;
          quantity: number;
          ref_id: string;
          source: Json;
          status: string;
          ticker: string;
          trade_date: string;
          wht: number;
        };
        Insert: {
          action: string;
          broker?: string;
          broker_account_id?: string | null;
          confidence_score?: number;
          created_at?: string;
          document_id?: string | null;
          exchange?: string;
          fees?: number;
          id?: string;
          notes?: string | null;
          org_id: string;
          price: number;
          quantity: number;
          ref_id?: string;
          source?: Json;
          status?: string;
          ticker: string;
          trade_date: string;
          wht?: number;
        };
        Update: {
          action?: string;
          broker?: string;
          broker_account_id?: string | null;
          confidence_score?: number;
          created_at?: string;
          document_id?: string | null;
          exchange?: string;
          fees?: number;
          id?: string;
          notes?: string | null;
          org_id?: string;
          price?: number;
          quantity?: number;
          ref_id?: string;
          source?: Json;
          status?: string;
          ticker?: string;
          trade_date?: string;
          wht?: number;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_broker_account_id_fkey";
            columns: ["broker_account_id"];
            isOneToOne: false;
            referencedRelation: "broker_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_monthly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "transactions_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_nightly";
            referencedColumns: ["org_id"];
          },
        ];
      };
    };
    Views: {
      ai_usage_today: {
        Row: {
          credits_used_today: number | null;
          org_id: string | null;
          plan: string | null;
          requests_today: number | null;
          user_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_usage_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_usage_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_monthly";
            referencedColumns: ["org_id"];
          },
          {
            foreignKeyName: "ai_usage_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs_needing_nightly";
            referencedColumns: ["org_id"];
          },
        ];
      };
      orgs_needing_monthly: {
        Row: {
          org_id: string | null;
        };
        Relationships: [];
      };
      orgs_needing_nightly: {
        Row: {
          org_id: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      complete_agent_job: {
        Args: {
          p_error?: string;
          p_job_id: string;
          p_result?: Json;
          p_status: string;
        };
        Returns: undefined;
      };
      current_org_id: { Args: never; Returns: string };
      current_org_ids: { Args: never; Returns: string[] };
      dequeue_agent_job: {
        Args: { p_worker_id?: string };
        Returns: {
          attempt_count: number;
          created_at: string;
          error_message: string | null;
          id: string;
          idempotency_key: string;
          max_attempts: number;
          next_run_at: string;
          org_id: string;
          result_summary: Json | null;
          run_id: string | null;
          status: string;
          trigger_payload: Json;
          trigger_type: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "agent_jobs";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      enqueue_monthly_jobs: { Args: never; Returns: number };
      enqueue_nightly_jobs: { Args: never; Returns: number };
      get_or_create_subscription: {
        Args: { org_id_param: string };
        Returns: {
          cancel_at_period_end: boolean;
          cancelled_at: string | null;
          charge_period: string;
          created_at: string;
          current_period_end: string | null;
          id: string;
          kelviq_customer_id: string | null;
          kelviq_subscription_id: string | null;
          metadata: Json | null;
          org_id: string;
          plan: string;
          status: string;
          trial_end_at: string | null;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "subscriptions";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      get_user_plan_limits: {
        Args: { org_id_param: string };
        Returns: {
          can_use_advanced_integrations: boolean;
          can_use_ai: boolean;
          can_use_background_tasks: boolean;
          plan: string;
          status: string;
          trial_ends_at: string;
        }[];
      };
      has_active_subscription: {
        Args: { org_id_param: string };
        Returns: boolean;
      };
      provision_current_user: {
        Args: { _full_name: string; _jurisdiction?: string; _org_name: string };
        Returns: {
          created_at: string;
          full_name: string;
          id: string;
          org_id: string;
          role: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "profiles";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      retry_agent_job: {
        Args: { p_error?: string; p_job_id: string };
        Returns: undefined;
      };
      revert_run: { Args: { p_run_id: string }; Returns: number };
      schedule_heartbeat: { Args: never; Returns: Json };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
