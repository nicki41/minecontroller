import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

export function usePublicIp() {
  return useQuery({
    queryKey: ["system", "network"],
    queryFn: () => api.get<{ publicIp: string | null }>("/system/network"),
    staleTime: 30 * 60_000,
  });
}
