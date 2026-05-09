import CONFIG from '../config';
import { urlBase64ToUint8Array } from './index';

const SUBSCRIBE_URL   = `${CONFIG.BASE_URL}/notifications/subscribe`;
const UNSUBSCRIBE_URL = `${CONFIG.BASE_URL}/notifications/subscribe`;

/* ---- Convert ArrayBuffer → base64url (required by many push servers) ---- */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary  = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/* ---- Register SW ---- */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    console.log('[SW] Registered:', reg.scope);
    return reg;
  } catch (err) {
    console.error('[SW] Registration failed:', err);
    return null;
  }
}

/* ---- Permission ---- */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  return await Notification.requestPermission();
}

/* ---- Subscribe ---- */
export async function subscribePushNotification(registration) {
  const sub = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(CONFIG.VAPID_PUBLIC_KEY),
  });

  const token  = localStorage.getItem('kisah_token');

  // Use base64url encoding (no +/=) for compatibility with the API
  const p256dh = arrayBufferToBase64(sub.getKey('p256dh'));
  const auth   = arrayBufferToBase64(sub.getKey('auth'));

  const res = await fetch(SUBSCRIBE_URL, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      endpoint: sub.endpoint,
      keys: { p256dh, auth },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Gagal subscribe notifikasi');
  console.log('[Push] Subscribed OK:', data.message);
  return sub;
}

/* ---- Unsubscribe ---- */
export async function unsubscribePushNotification(registration) {
  const sub = await registration.pushManager.getSubscription();
  if (!sub) return;

  const token  = localStorage.getItem('kisah_token');
  const p256dh = arrayBufferToBase64(sub.getKey('p256dh'));
  const auth   = arrayBufferToBase64(sub.getKey('auth'));

  await fetch(UNSUBSCRIBE_URL, {
    method:  'DELETE',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      endpoint: sub.endpoint,
      keys: { p256dh, auth },
    }),
  }).catch((e) => console.warn('[Push] Unsubscribe API error:', e));

  await sub.unsubscribe();
  console.log('[Push] Unsubscribed');
}

/* ---- Check status ---- */
export async function getSubscriptionStatus(registration) {
  if (!registration) return false;
  const sub = await registration.pushManager.getSubscription().catch(() => null);
  return !!sub;
}

/* ---- Auto-subscribe (called after login / home load) ---- */
export async function autoSubscribeIfPermitted(registration) {
  if (!registration) return false;
  if (Notification.permission !== 'granted') return false;
  const isSubscribed = await getSubscriptionStatus(registration);
  if (isSubscribed) return true;
  try {
    await subscribePushNotification(registration);
    return true;
  } catch (err) {
    console.warn('[Push] Auto-subscribe failed:', err.message);
    return false;
  }
}
