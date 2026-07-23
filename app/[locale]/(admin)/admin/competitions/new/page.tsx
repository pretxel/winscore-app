import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CompetitionForm } from "@/components/admin/competition-form";
import { DEFAULT_LOCALE, isLocale, type Locale, localePath } from "@/lib/i18n";
import { createCompetition } from "../actions";

export default async function NewCompetitionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  setRequestLocale(locale);

  const t = await getTranslations("admin");

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="admin-reveal space-y-8">
        <div className="space-y-3">
          <Link
            href={localePath(locale, "/admin/competitions")}
            className="inline-flex items-center gap-1 rounded-md text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <ArrowLeftIcon className="size-4" aria-hidden />
            {t("form.backToCompetitions")}
          </Link>
          <AdminPageHeader title={t("form.newTitle")} description={t("form.newDescription")} />
        </div>
        <CompetitionForm action={createCompetition} locale={locale} />
      </div>
    </main>
  );
}
