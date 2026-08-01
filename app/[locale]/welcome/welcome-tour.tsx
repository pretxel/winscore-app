"use client";

import {
  CoinsIcon,
  type LucideIcon,
  ShieldAlertIcon,
  TrophyIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WalletLinkButton } from "@/components/wallet/wallet-link-button";
import { WELCOME_STEP_COUNT, WELCOME_STEPS } from "@/lib/onboarding/steps";
import { markWelcomeSeen } from "./actions";

const ICONS: Record<string, LucideIcon> = {
  TrophyIcon,
  UsersIcon,
  CoinsIcon,
  WalletIcon,
  ShieldAlertIcon,
};

/**
 * The five-step welcome tour. Step state is local because the flow is linear
 * and skippable — per-step URLs would add five routes to maintain for no gain.
 *
 * `walletAddress` is a base58 address when the player already linked a wallet;
 * it is passed straight to WalletLinkButton, which renders it truncated.
 */
export function WelcomeTour({ walletAddress }: { walletAddress?: string }) {
  const t = useTranslations("welcome");
  const [index, setIndex] = useState(0);

  const step = WELCOME_STEPS[index];
  const Icon = ICONS[step.icon];
  const isLast = index === WELCOME_STEP_COUNT - 1;

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-lg flex-col justify-center px-6 py-12">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
          {t("progress", { current: index + 1, total: WELCOME_STEP_COUNT })}
        </p>
        <form action={markWelcomeSeen}>
          <Button type="submit" variant="ghost" size="sm">
            {t("skip")}
          </Button>
        </form>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className="size-4 text-flag" />
            {t(`${step.id}Title`)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t(`${step.id}Body`)}</p>

          {step.id === "scoring" && (
            <ul className="space-y-1 text-sm">
              <li>{t("scoringExact")}</li>
              <li>{t("scoringWinnerGd")}</li>
              <li>{t("scoringWinner")}</li>
            </ul>
          )}

          {step.id === "wallet" && (
            <div className="space-y-3">
              <WalletLinkButton initialWalletAddress={walletAddress} />
              <p className="text-xs text-muted-foreground">{t("walletOptional")}</p>
            </div>
          )}

          {step.id === "risk" && (
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>{t("riskDevnet")}</li>
              <li>{t("riskOracle")}</li>
              <li>{t("riskFinal")}</li>
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIndex((i) => i - 1)}
          disabled={index === 0}
        >
          {t("back")}
        </Button>

        {isLast ? (
          <form action={markWelcomeSeen}>
            <Button type="submit" size="sm">
              {t("finish")}
            </Button>
          </form>
        ) : (
          <Button size="sm" onClick={() => setIndex((i) => i + 1)}>
            {t("next")}
          </Button>
        )}
      </div>
    </main>
  );
}
