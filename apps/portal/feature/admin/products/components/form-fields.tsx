"use client";

import type { ReactNode } from "react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { Switch } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";

// Only the product forms need a switch and a select field; they move to
// components/form/ when a second feature needs them (rule I7).

interface BaseProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

/** A boolean field shown as a labelled switch row. */
export function SwitchField<T extends FieldValues>({ control, name, label, description, disabled, className }: BaseProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, ...field } }) => (
        <label className={className ?? "flex items-start justify-between gap-4 rounded-lg border p-3"}>
          <span className="min-w-0 space-y-0.5">
            <span className="block text-sm font-medium">{label}</span>
            {description ? <span className="block text-xs text-muted-foreground">{description}</span> : null}
          </span>
          <Switch
            {...field}
            id={name}
            checked={Boolean(value)}
            disabled={disabled}
            onChange={(event) => onChange(event.target.checked)}
          />
        </label>
      )}
    />
  );
}

/** A native `<select>` bound to a string field. */
export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disabled,
  className,
  children,
}: BaseProps<T> & { children: ReactNode }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, ...field }, fieldState: { invalid, error } }) => (
        <Field name={name} invalid={invalid} className={className}>
          <FieldLabel htmlFor={name}>{label}</FieldLabel>
          <NativeSelect
            {...field}
            id={name}
            className="w-full"
            value={value ?? ""}
            disabled={disabled}
            aria-invalid={invalid || undefined}
          >
            {children}
          </NativeSelect>
          {description ? <FieldDescription>{description}</FieldDescription> : null}
          <FieldError match={!!error}>{error?.message}</FieldError>
        </Field>
      )}
    />
  );
}
