"use client";

import { useQuery } from "@tanstack/react-query";
import { meQuery } from "./queries";
import { useSession } from "./session-store";

/** `GET /me` for the profile page (UC-05); only runs once signed in. */
export function useMe() {
  const { status } = useSession();
  return useQuery({ ...meQuery(), enabled: status === "signed-in" });
}
