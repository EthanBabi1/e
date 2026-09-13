export interface ContactFilterResult {
  blocked: boolean;
  reason: string | null;
}

// Phone: sequences of digits/separators that read as a phone number.
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/;
// Email address.
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
// Common social-handle patterns: @handle, or "insta/instagram/snap/tiktok
// is <handle>" style phrasing.
const HANDLE_RE = /(^|\s)@[a-zA-Z0-9_.]{2,}/;
const SOCIAL_MENTION_RE = /\b(insta(gram)?|snap(chat)?|tiktok|whatsapp|telegram|discord)\b/i;

/**
 * Section 6: "detect phone numbers, email addresses and social handles,
 * and block them with a clear explanation of why. Never strip silently —
 * that reads as a bug and people just try again." This returns a decision
 * for the WHOLE message (block or allow) rather than silently redacting
 * matched substrings, per that explicit instruction.
 */
export function checkForContactInfo(body: string): ContactFilterResult {
  if (EMAIL_RE.test(body)) {
    return { blocked: true, reason: "This message looks like it contains an email address. Contact details can't be shared here — everything stays on-platform." };
  }
  if (PHONE_RE.test(body)) {
    return { blocked: true, reason: "This message looks like it contains a phone number. Contact details can't be shared here — everything stays on-platform." };
  }
  if (HANDLE_RE.test(body) || SOCIAL_MENTION_RE.test(body)) {
    return { blocked: true, reason: "This message looks like it's sharing a social media handle. Contact details can't be shared here — everything stays on-platform." };
  }
  return { blocked: false, reason: null };
}
