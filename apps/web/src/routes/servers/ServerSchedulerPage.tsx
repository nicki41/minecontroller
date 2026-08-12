import { SchedulerCard } from "@/components/servers/SchedulerCard";
import { useServerOutletContext } from "./useServerOutletContext";

export default function ServerSchedulerPage() {
  const { server } = useServerOutletContext();
  return <SchedulerCard server={server} />;
}
