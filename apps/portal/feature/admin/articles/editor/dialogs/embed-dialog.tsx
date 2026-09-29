"use client";

import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EMBED_PROVIDERS, EMBED_PROVIDER_KEYS, parseEmbedUrl, type EmbedProvider } from "@/feature/content";

/**
 * Embed a video, demo, or design (ADR-009 §5.5). The URL is parsed against
 * the provider allowlist and stored as `provider` + `id`. When the admin
 * pasted a URL on an empty line, "Keep as link" inserts it as a plain link
 * instead; an unsupported URL can become a link card.
 */
export function EmbedDialog({
  open,
  onOpenChange,
  initialUrl,
  offerKeepAsLink,
  onEmbed,
  onKeepAsLink,
  onLinkCard,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialUrl: string;
  offerKeepAsLink: boolean;
  onEmbed: (embed: { provider: EmbedProvider; id: string }) => void;
  onKeepAsLink: (url: string) => void;
  onLinkCard: (url: string) => void;
}) {
  const { t } = useTranslation("admin");
  const providers = EMBED_PROVIDER_KEYS.map((key) => EMBED_PROVIDERS[key].label).join(", ");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("editor.embed.title")}</DialogTitle>
          <DialogDescription>{t("editor.embed.description", { providers })}</DialogDescription>
        </DialogHeader>
        {open ? (
          <EmbedForm
            key={initialUrl}
            initialUrl={initialUrl}
            offerKeepAsLink={offerKeepAsLink}
            onCancel={() => onOpenChange(false)}
            onEmbed={(embed) => {
              onEmbed(embed);
              onOpenChange(false);
            }}
            onKeepAsLink={(url) => {
              onKeepAsLink(url);
              onOpenChange(false);
            }}
            onLinkCard={(url) => {
              onOpenChange(false);
              onLinkCard(url);
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function EmbedForm({
  initialUrl,
  offerKeepAsLink,
  onCancel,
  onEmbed,
  onKeepAsLink,
  onLinkCard,
}: {
  initialUrl: string;
  offerKeepAsLink: boolean;
  onCancel: () => void;
  onEmbed: (embed: { provider: EmbedProvider; id: string }) => void;
  onKeepAsLink: (url: string) => void;
  onLinkCard: (url: string) => void;
}) {
  const { t } = useTranslation("admin");
  const id = useId();
  const [url, setUrl] = useState(initialUrl);
  const parsed = parseEmbedUrl(url);
  const unsupported = Boolean(url.trim()) && !parsed;

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (parsed) onEmbed(parsed);
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-url`}>{t("editor.embed.url")}</Label>
        <Input
          id={`${id}-url`}
          autoFocus
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://www.youtube.com/watch?v=…"
          aria-invalid={unsupported || undefined}
        />
        {parsed ? (
          <p className="flex items-center gap-1.5 text-xs text-success">
            <CheckCircle2 className="size-3.5" aria-hidden />
            {t("editor.embed.detected", { provider: EMBED_PROVIDERS[parsed.provider].label, id: parsed.id })}
          </p>
        ) : unsupported ? (
          <p className="text-xs text-destructive">{t("editor.embed.unsupported")}</p>
        ) : null}
      </div>
      <DialogFooter className="flex-wrap">
        {unsupported && url.trim().startsWith("https://") ? (
          <Button type="button" variant="outline" onClick={() => onLinkCard(url.trim())} className="sm:mr-auto">
            {t("editor.embed.asLinkCard")}
          </Button>
        ) : null}
        {offerKeepAsLink ? (
          <Button type="button" variant="outline" onClick={() => onKeepAsLink(url.trim())} className="sm:mr-auto">
            {t("editor.embed.keepAsLink")}
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("cancel", { ns: "common" })}
          </Button>
        )}
        <Button type="submit" disabled={!parsed}>
          {t("editor.embed.insert")}
        </Button>
      </DialogFooter>
    </form>
  );
}
