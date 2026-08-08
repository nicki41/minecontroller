import { useOutletContext } from "react-router-dom";
import type { ServerDto } from "@minecraftpanel/shared";

export function useServerOutletContext() {
  return useOutletContext<{ server: ServerDto }>();
}
