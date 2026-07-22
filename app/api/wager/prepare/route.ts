import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getWagerEnv } from "@/lib/wager/env";
import { deriveEntryPda } from "@/lib/wager/pda";
import { transitionIntentState } from "@/lib/wager/entry-saga";
import { base58 } from "@scure/base";
import { createHash } from "crypto";
