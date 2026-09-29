"use client";

import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LIMITS } from "@/feature/content";
import { cn } from "@/lib/utils";

const GRID = 8;

const clamp = (value: number, max: number) => Math.min(max, Math.max(1, Math.round(value) || 1));

/** Table size picker (ADR-009 §5.6): default 3 × 3 with a header row. */
export function TableDialog({
  open,
  onOpenChange,
  onInsert,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (options: { rows: number; cols: number; withHeaderRow: boolean }) => void;
}) {
  const { t } = useTranslation("admin");
  const id = useId();
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [header, setHeader] = useState(true);
  const [hover, setHover] = useState<{ rows: number; cols: number } | null>(null);
  const shown = hover ?? { rows, cols };

  function insert(size = { rows, cols }) {
    onInsert({ rows: clamp(size.rows, LIMITS.maxTableRows), cols: clamp(size.cols, LIMITS.maxTableColumns), withHeaderRow: header });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("editor.table.insertTitle")}</DialogTitle>
          <DialogDescription>{t("editor.table.insertDescription")}</DialogDescription>
        </DialogHeader>
        <div
          className="grid w-fit gap-1"
          style={{ gridTemplateColumns: `repeat(${GRID}, 1.25rem)` }}
          onMouseLeave={() => setHover(null)}
          role="grid"
          aria-label={t("editor.table.size", { rows: shown.rows, cols: shown.cols })}
        >
          {Array.from({ length: GRID * GRID }, (_, index) => {
            const r = Math.floor(index / GRID) + 1;
            const c = (index % GRID) + 1;
            const on = r <= shown.rows && c <= shown.cols;
            return (
              <button
                key={index}
                type="button"
                tabIndex={-1}
                aria-label={t("editor.table.size", { rows: r, cols: c })}
                onMouseEnter={() => setHover({ rows: r, cols: c })}
                onClick={() => {
                  setRows(r);
                  setCols(c);
                  insert({ rows: r, cols: c });
                }}
                className={cn("size-5 rounded-sm border transition-colors", on ? "border-primary bg-primary/20" : "bg-muted/40")}
              />
            );
          })}
        </div>
        <p className="text-sm text-muted-foreground tabular-nums">{t("editor.table.size", { rows: shown.rows, cols: shown.cols })}</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-rows`}>{t("editor.table.rows")}</Label>
            <Input
              id={`${id}-rows`}
              type="number"
              min={1}
              max={LIMITS.maxTableRows}
              value={rows}
              onChange={(event) => setRows(clamp(Number(event.target.value), LIMITS.maxTableRows))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-cols`}>{t("editor.table.cols")}</Label>
            <Input
              id={`${id}-cols`}
              type="number"
              min={1}
              max={LIMITS.maxTableColumns}
              value={cols}
              onChange={(event) => setCols(clamp(Number(event.target.value), LIMITS.maxTableColumns))}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={header} onChange={(event) => setHeader(event.target.checked)} />
          {t("editor.table.headerRow")}
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel", { ns: "common" })}
          </Button>
          <Button onClick={() => insert()}>{t("editor.table.insert")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
