import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// The shape a read-only loader needs from a Supabase client, so the same query
// can run under either of ours: the session client for a request-time read, or
// the cookie-free public client inside a cached function.
//
// Loaders take this rather than creating a client themselves, which is what
// lets one implementation serve both paths without the query drifting between
// them.
export type ReadClient = SupabaseClient<Database>;
