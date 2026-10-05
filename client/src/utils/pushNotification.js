const VAPID_PUBLIC_KEY =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_VAPID_PUBLIC_KEY) ||
  process.env.REACT_APP_VAPID_PUBLIC_KEY ||
  process.env.VAPID_PUBLIC_KEY ||
  "BIBxNBq6SgBz8dGRmx-83HInUGR-n4nP8jymsAe2P9eYGvbXCVnIiht0CUKUFlawdMWm9b-_RbHNdQD-zUvSlhE";

function urlBase64ToUint8Array(base64String) {
  if (!base64String) return new Uint8Array(0);
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export async function subscribeToPush(apiBaseUrl, authToken) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push notifications not supported in this browser');
    return { success: false, reason: 'unsupported' };
  }

  if (!VAPID_PUBLIC_KEY) {
    console.warn('VAPID_PUBLIC_KEY is not defined in environment variables');
    return { success: false, reason: 'missing_key' };
  }

  // Agar pehle se permission "denied" hai toh dobara mat poocho
  if (Notification.permission === 'denied') {
    return { success: false, reason: 'denied' };
  }

  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { success: false, reason: 'not-granted' };
  }

  // Agar already subscribed hai toh dobara subscribe mat karo
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const token =
    authToken ||
    localStorage.getItem("token") ||
    localStorage.getItem("Pravixo_token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken");

  let url = apiBaseUrl;
  if (!url) {
    let base = import.meta.env.VITE_API_URL || "http://localhost:5000";
    if (base.endsWith("/")) base = base.slice(0, -1);
    if (!base.endsWith("/api")) base = `${base}/api`;
    url = `${base}/push/subscribe`;
  } else {
    if (url.endsWith("/")) url = url.slice(0, -1);
    url = url.endsWith("/api") ? `${url}/push/subscribe` : `${url}/api/push/subscribe`;
  }

  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ subscription }),
  });

  return { success: true };
}

export async function unsubscribeFromPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { success: false, reason: 'unsupported' };
  }
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }
    return { success: true };
  } catch (err) {
    console.error("Unsubscribe error:", err);
    return { success: false, error: err.message };
  }
}

if (typeof window !== "undefined") {
  window.subscribeToPush = subscribeToPush;
  window.unsubscribeFromPush = unsubscribeFromPush;
}