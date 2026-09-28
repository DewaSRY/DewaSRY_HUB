import * as React from "react";
import { cn } from "@/lib/utils";

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    // eslint-disable-next-line jsx-a11y/label-has-associated-control -- callers pass htmlFor or nest the control.
    <label
      data-slot="label"
      className={cn("text-sm leading-none font-medium text-foreground select-none", className)}
      {...props}
    />
  );
}

export { Label };
