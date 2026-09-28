"use client";

import { useMutation } from "@tanstack/react-query";
import { ssoClient } from "./client";
import type { SsoCodeInput } from "./type";

export function useCreateSsoCode() {
  return useMutation({
    mutationFn: (input: SsoCodeInput) => ssoClient.createCode(input).then((response) => response.data.data),
    meta: { errorMessage: false },
  });
}
