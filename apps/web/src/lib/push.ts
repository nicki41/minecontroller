import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window;
}

async function getVapidPublicKey(): Promise<string | null> {
  const { vapidPublicKey } = await api.get<{ vapidPublicKey: string | null }>("/system/notifications/vapid-public-key");
  return vapidPublicKey;
}

/**
 * Registers this browser/device for push, from an explicit user action
 * (a button click) — never called on page load, so the permission prompt
 * only ever appears when the user asked for it.
 */
export async function subscribeToPush(): Promise<void> {
  if (!isPushSupported()) throw new Error("Push notifications are not supported in this browser.");

  const vapidPublicKey = await getVapidPublicKey();
  if (!vapidPublicKey) throw new Error("Push notifications are not configured on this server.");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission was not granted.");

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    // TS's DOM lib types PushSubscriptionOptionsInit.applicationServerKey as
    // ArrayBuffer-backed BufferSource; Uint8Array's own type is generic over
    // ArrayBufferLike (which also covers SharedArrayBuffer), so it doesn't
    // structurally match without this cast even though the actual value is
    // always a plain ArrayBuffer here.
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
  });

  const json = subscription.toJSON();
  await api.post("/users/me/push-subscriptions", {
    endpoint: json.endpoint,
    keys: json.keys,
    userAgent: navigator.userAgent,
  });
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await api.delete("/users/me/push-subscriptions", { endpoint });
}

export function useIsPushSubscribedOnThisDevice() {
  return useQuery({
    queryKey: ["push", "subscribed-on-this-device"],
    queryFn: async () => {
      if (!isPushSupported()) return false;
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      return subscription !== null;
    },
  });
}

export function useSubscribeToPush() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: subscribeToPush,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["push", "subscribed-on-this-device"] }),
  });
}

export function useUnsubscribeFromPush() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: unsubscribeFromPush,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["push", "subscribed-on-this-device"] }),
  });
}
