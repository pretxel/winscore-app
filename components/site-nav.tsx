import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logotype } from "@/components/logotype";
import { MobileNav, NavLinks } from "@/components/site-nav-client";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";
import { DEFAULT_EMAIL_PREFS, type EmailPrefs, normalizeEmailPrefs } from "@/lib/email-prefs";
import { DEFAULT_LOCALE, isLocale, type Locale, localePath } from "@/lib/i18n";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

// The site name is the same constant the root layout and metadata already use.
// The nav previously resolved it from the active competition's branding, which
// meant a database read just to label the logo — and a read in the layout keeps
// every route's shell out of the prerender.
const SITE_NAME = "Winscore";

// The nav splits in two so the page shell no longer waits on the session.
//
// Static frame: the header bar, the logo, the public links, and the two
// controls that need no session. This is what gets prerendered.
//
// Streamed: the links that only exist for a signed-in or admin viewer, and the
// account control. Both sit behind their own Suspense boundary, so reading the
// session no longer makes the whole route render per request.
export function SiteNav({ locale: rawLocale }: { locale?: string }) {
  const locale = isLocale(rawLocale ?? "") ? (rawLocale as Locale) : DEFAULT_LOCALE;
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link
          href={localePath(locale, "/")}
          className="group/brand flex items-center"
          aria-label={SITE_NAME}
        >
          <Logotype size="xs" className="text-foreground" />
        </Link>
        {/* The fallback is the public subset every visitor sees, so a signed-in
            viewer only ever gains links — nothing appears then disappears. */}
        <Suspense fallback={<PublicNavLinks locale={locale} className="hidden md:flex" />}>
          <SessionNavLinks locale={locale} className="hidden md:flex" />
        </Suspense>
        <div className="flex items-center gap-1.5">
          <LanguageSwitcher />
          <ThemeToggle />
          <Suspense fallback={<AccountSlotFallback />}>
            <AccountSlot locale={locale} />
          </Suspense>
        </div>
      </nav>
    </header>
  );
}

// Links that need no session. Rendered as the streamed list's fallback and, on
// a signed-out request, as its final content too.
async function PublicNavLinks({ locale, className }: { locale: Locale; className?: string }) {
  const t = await getTranslations("nav");
  return <NavLinks links={publicLinks(locale, t)} className={className} />;
}

function publicLinks(locale: Locale, t: (key: string) => string) {
  return [
    { href: localePath(locale, "/catalog"), label: t("leagues") },
    { href: localePath(locale, "/news"), label: t("news") },
  ];
}

// Matches/standings/bracket/leaderboard/my-picks are league-scoped (under
// /[league]) and can't be linked without a league, so the global nav routes to
// the league catalog instead; per-league pages are reached from the home lanes,
// the catalog, and pool dashboards.
async function SessionNavLinks({ locale, className }: { locale: Locale; className?: string }) {
  const t = await getTranslations("nav");
  const { user, isAdmin } = await readViewer();
  const links = [
    ...publicLinks(locale, t),
    ...(user ? [{ href: localePath(locale, "/groups"), label: t("groups") }] : []),
    ...(isAdmin ? [{ href: localePath(locale, "/admin/matches"), label: t("admin") }] : []),
  ];
  return <NavLinks links={links} className={className} />;
}

// Reserves the account control's footprint so the row never changes height and
// the controls beside it never move when the session resolves.
function AccountSlotFallback() {
  return <div aria-hidden className="size-8 shrink-0" />;
}

async function AccountSlot({ locale }: { locale: Locale }) {
  const tCommon = await getTranslations("common");
  const t = await getTranslations("nav");
  const { user, isAdmin, displayName, emailPrefs } = await readViewer();
  const links = [
    ...publicLinks(locale, t),
    ...(user ? [{ href: localePath(locale, "/groups"), label: t("groups") }] : []),
    ...(isAdmin ? [{ href: localePath(locale, "/admin/matches"), label: t("admin") }] : []),
  ];
  return (
    <>
      {user ? (
        <UserMenu
          displayName={displayName}
          email={user.email ?? ""}
          emailPrefs={emailPrefs}
          signOutPath={localePath(locale, "/sign-out")}
          locale={locale}
        />
      ) : (
        <Link
          href={localePath(locale, "/sign-in")}
          className={cn(buttonVariants({ size: "sm" }), "hidden sm:inline-flex")}
        >
          {tCommon("signIn")}
        </Link>
      )}
      <MobileNav links={links} signedIn={!!user} className="md:hidden" />
    </>
  );
}

type Viewer = {
  user: { id: string; email: string | null } | null;
  isAdmin: boolean;
  displayName: string | null;
  emailPrefs: EmailPrefs;
};

// Both streamed slots need the same three facts. React dedupes the identical
// calls within one render, so this runs once per request despite two callers.
async function readViewer(): Promise<Viewer> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { user: null, isAdmin: false, displayName: null, emailPrefs: DEFAULT_EMAIL_PREFS };
  }
  const { data } = await supabase
    .from("profiles")
    .select("is_admin, display_name, email_prefs")
    .eq("id", user.id)
    .single();
  return {
    user: { id: user.id, email: user.email ?? null },
    isAdmin: data?.is_admin ?? false,
    displayName: data?.display_name ?? null,
    emailPrefs: normalizeEmailPrefs(data?.email_prefs),
  };
}

export async function SiteFooter() {
  const t = await getTranslations("footer");
  const rawLocale = await getLocale();
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return (
    <footer className="mt-auto border-t border-border/70">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Logotype size="xs" className="text-foreground" />
          <span className="font-mono uppercase tracking-[0.2em]">{t("tournament")}</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href={localePath(locale, "/how-it-works")}
            className="hover:text-foreground hover:underline"
          >
            {t("howItWorks")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
