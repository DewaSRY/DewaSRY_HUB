import { queryOptions } from "@tanstack/react-query";
import { authClient } from "./client";

export const authKeys = {
  all: ["auth"] as const,
  me: () => [...authKeys.all, "me"] as const,
};

export const meQuery = () =>
  queryOptions({
    queryKey: authKeys.me(),
    queryFn: () => authClient.getMe().then((response) => response.data.data),
  });
