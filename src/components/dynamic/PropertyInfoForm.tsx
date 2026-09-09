"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import {
  EMPTY_PROPERTY,
  loadPropertyListing,
  savePropertyListing,
  type PropertyListing,
} from "@/lib/dynamic/property";
import { getTemplateById } from "@/data/templates";
import { loadUploadSession } from "@/lib/storage";
import { loadWritingStyle } from "@/lib/writing/session";
import { getFont } from "@/lib/render/edit-options";

type PropertyInfoFormProps = {
  templateId: string;
};

const FIELDS: {
  key: "titleLine1" | "titleLine2" | "specs" | "highlight" | "cta";
  label: string;
  placeholder: string;
  hint?: string;
}[] = [
  {
    key: "titleLine1",
    label: "Titre — ligne 1",
    placeholder: "Banlieue",
    hint: "Grand titre",
  },
  {
    key: "titleLine2",
    label: "Titre — ligne 2",
    placeholder: "Parisienne",
  },
  {
    key: "specs",
    label: "Caractéristiques",
    placeholder: "3 pièces, 85m²",
  },
  {
    key: "highlight",
    label: "Prix ou accroche",
    placeholder: "Exclusivité",
  },
  {
    key: "cta",
    label: "Appel à l’action",
    placeholder: "Contactez-nous",
  },
];

export function PropertyInfoForm({ templateId }: PropertyInfoFormProps) {
  const router = useRouter();
  const [listing, setListing] = useState<PropertyListing>(EMPTY_PROPERTY);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fontFamily, setFontFamily] = useState("inherit");
  const [fontLabel, setFontLabel] = useState("");
  const template = getTemplateById(templateId);
  const isDynamic = template?.category === "dynamic";

  useEffect(() => {
    const upload = loadUploadSession();
    if (!upload || upload.templateId !== templateId || !upload.medias.length) {
      router.replace(`/creer/medias?template=${templateId}`);
      return;
    }
    const saved = loadPropertyListing();
    if (saved) setListing(saved);
    const writing = loadWritingStyle();
    const font = getFont(writing.fontId);
    setFontFamily(font.cssFamily);
    setFontLabel(font.label);
    setReady(true);
  }, [templateId, router]);

  const update = (key: keyof PropertyListing, value: string) => {
    setListing((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    const hasTitle = listing.titleLine1.trim() || listing.titleLine2.trim();
    if (!hasTitle) {
      setError("Ajoute au moins une ligne de titre.");
      return;
    }
    setError(null);
    savePropertyListing(listing);
    if (isDynamic) {
      router.push(`/creer/generer?template=${templateId}`);
    } else {
      router.push(`/creer/rendu?template=${templateId}`);
    }
  };

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center py-16 text-sm text-muted">
        Chargement…
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
      <div className="animate-fade-up px-5 pt-1 text-center sm:px-8">
        <p className="text-[11px] font-medium tracking-[0.2em] text-muted uppercase">
          Étape 4
        </p>
        <h2 className="mt-1.5 font-display text-3xl font-medium tracking-tight text-pearl sm:text-4xl">
          Vos textes
        </h2>
        <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-muted">
          Ils s’afficheront dans le style choisi
          {fontLabel ? ` (${fontLabel})` : ""}.
        </p>
      </div>

      <div className="animate-fade-up animate-delay-1 mx-auto mt-8 w-full max-w-lg space-y-5 px-5 sm:px-8">
        {FIELDS.map((field) => (
          <label key={field.key} className="block text-left">
            <span className="text-[12px] font-medium tracking-wide text-muted-strong uppercase">
              {field.label}
            </span>
            <input
              type="text"
              value={listing[field.key]}
              onChange={(e) => update(field.key, e.target.value)}
              placeholder={field.placeholder}
              maxLength={80}
              className="mt-1.5 w-full rounded-xl border border-border bg-surface px-4 py-3 text-[17px] text-pearl outline-none transition-colors placeholder:text-muted/50 focus:border-gold/50"
              style={{ fontFamily: fontFamily }}
            />
            {field.hint ? (
              <span className="mt-1 block text-[12px] text-muted">
                {field.hint}
              </span>
            ) : null}
          </label>
        ))}

        {error ? (
          <p className="text-center text-[13px] text-red-400" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/85 px-5 pt-3 pb-[calc(0.85rem+env(safe-area-inset-bottom))] backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-lg justify-center gap-3 sm:max-w-xl">
          <Button
            variant="ghost"
            onClick={() =>
              router.push(`/creer/ecriture?template=${templateId}`)
            }
          >
            Retour
          </Button>
          <Button
            fullWidth
            className="sm:w-auto sm:min-w-[220px]"
            variant="gold"
            showArrow
            onClick={handleSubmit}
          >
            {isDynamic ? "Lancer la génération" : "Ouvrir la timeline"}
          </Button>
        </div>
      </div>
    </div>
  );
}
