import { getTranslations, setRequestLocale } from "next-intl/server";
import { WalletLinkButton } from "@/components/wallet/wallet-link-button";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  setRequestLocale(locale);

  const t = await getTranslations("profile");

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let link: {
    id: string;
    walletAddress: string;
    cluster: string;
    linkedAt: string;
  } | null = null;

  if (user) {
    const { data } = await supabase
      .from("wallet_links")
      .select("id, wallet_address, cluster, linked_at")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (data) {
      link = {
        id: data.id,
        walletAddress: data.wallet_address,
        cluster: data.cluster,
        linkedAt: data.linked_at,
      };
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-6 border-b border-border pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
          {t("eyebrow")}
        </p>
        <h1
          className="mt-1 font-heading text-4xl font-semibold tracking-tight sm:text-5xl"
          style={{ fontStretch: "condensed" }}
        >
          {t("title")}
        </h1>
      </header>

      <section>
        <h2 className="mb-3 font-heading text-lg font-semibold">{t("walletTitle")}</h2>

        {link ? (
          <div className="space-y-2">
            <WalletLinkButton
              initialWalletAddress={link.walletAddress}
              initialLinkId={link.id}
              initialCluster={link.cluster}
            />
            <p className="text-xs text-muted-foreground">
              {t("walletLinkedOn", {
                date: new Date(link.linkedAt).toLocaleDateString(locale, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                }),
              })}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <WalletLinkButton />
            <p className="text-xs text-muted-foreground">{t("walletEmpty")}</p>
          </div>
        )}
      </section>
    </main>
  );
}
