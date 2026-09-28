import { appUrl } from "../email";

/** Cookie holding the OAuth state for "Connect Google Calendar" (CSRF protection). */
export const STATE_COOKIE = "g_oauth_state";
export const connectRedirectUri = () => `${appUrl()}/api/google/callback`;
