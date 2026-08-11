import { BackupsCard } from "@/components/servers/BackupsCard";
import { useServerOutletContext } from "./useServerOutletContext";

export default function ServerBackupsPage() {
  const { server } = useServerOutletContext();
  return <BackupsCard server={server} />;
}
