// Route helpers that decide which chrome renders. See AppChrome.tsx.
// When the user is authenticated, the left Sidebar replaces the top Navbar on
// every route EXCEPT the immersive space viewer. Logged-out visitors always
// get the top Navbar.

// Immersive full-screen space viewer — keeps its own chrome-hide gesture and
// gets no sidebar. Matches "/<username>/space/<id>" and "/space/<id>".
const IMMERSIVE_ROUTE_RE = /^\/(?:[^/]+\/)?space\/[^/]+/;

// Public booking widget viewer — a fully branded, chromeless page: it renders
// its own hero (business avatar + name) and needs no app Navbar, Sidebar,
// footer, or mobile tab bar. Matches "/<username>/widget/<instanceId>".
const WIDGET_ROUTE_RE = /^\/[^/]+\/widget\/[^/]+/;

export function isImmersiveRoute(pathname: string): boolean {
  return IMMERSIVE_ROUTE_RE.test(pathname) || WIDGET_ROUTE_RE.test(pathname);
}

// The public booking widget page owns its whole viewport — no app chrome.
export function isWidgetRoute(pathname: string): boolean {
  return WIDGET_ROUTE_RE.test(pathname);
}

// Reserved single-segment routes that are NOT a user profile page.
const RESERVED_TOP_SEGMENTS = new Set([
  "dashboard",
  "pricing",
  "login",
  "forgot-password",
  "contact",
  "cookies",
  "privacy",
  "terms",
  "mcp",
  "go",
  "booking",
  "hashtag",
  "setup-username",
  "auth",
  "sandbox",
  "space",
  "api",
]);

// Profile sub-sections that live in the same "(profile)" route group as the
// bare profile page and share its chromeless, full-width treatment.
const PROFILE_SUB_SEGMENTS = new Set(["contents", "gallery", "links"]);

// The public user profile page and its sub-sections: a first segment that isn't
// reserved, either on its own ("/felipe") or followed by a profile sub-section
// ("/felipe/contents"). On these pages we hide the top Navbar for logged-out
// visitors and auto-collapse the sidebar to give the profile full width.
export function isProfilePage(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0 || segments.length > 2) return false;
  const [first, second] = segments;
  if (RESERVED_TOP_SEGMENTS.has(first)) return false;
  return segments.length === 1 || PROFILE_SUB_SEGMENTS.has(second);
}
