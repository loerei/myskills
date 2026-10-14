# Browser, Web Frontend, and DOM Security

Audits Cross-Site Scripting (XSS), untrusted HTML/Markdown/SVG rendering, `postMessage` origin verification, Open Redirects, CSRF, and Content Security Policy (CSP).

## Domain Audit Checklist

### 1. DOM XSS & Untrusted Content Rendering
- [ ] **HTML / Markdown / SVG Sanitization**: Reject passing unvetted strings into `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `document.write`, `v-html`, or `{@html}` without passing through a strict allowlist sanitizer (`DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })`).
- [ ] **URI Scheme Injection in Links & Media**: Verify dynamic `<a href={url}>`, `<iframe src={url}>`, and `<img src={url}>` bindings parse URLs and reject `javascript:`, `data:text/html`, and `vbscript:` protocols.

### 2. Cross-Window Messaging & Redirect Boundaries
- [ ] **`postMessage` Origin & Source Validation**: Every `window.addEventListener("message", handler)` MUST verify `event.origin` against an explicit trusted allowlist (and verify `event.source` where applicable) before parsing `event.data`. Outbound `targetWindow.postMessage(payload, targetOrigin)` MUST specify an exact `targetOrigin`, never `"*"`.
- [ ] **Open Redirect Prevention**: Verify login/OAuth callback parameters (`?redirect=`, `?next=`, `returnUrl`) enforce relative path containment (starts with single `/` and not `//` or `/\`) or validate hostname against an explicit allowlist.

### 3. Cookie Session CSRF & Browser Headers
- [ ] **CSRF Defense on Cookie-Authenticated Mutations**: If state-changing endpoints (`POST`, `PUT`, `PATCH`, `DELETE`) rely on browser cookies, require `SameSite=Lax` or `Strict`, `Origin`/`Referer` header verification, or cryptographic anti-CSRF tokens.
- [ ] **Reverse Tabnabbing & Iframe Sandboxing**: External links opening new tabs (`target="_blank"`) MUST include `rel="noopener noreferrer"`. Untrusted embedded iframes MUST set a restrictive `sandbox` attribute without combining `allow-scripts` and `allow-same-origin`.

## Concrete Anti-Patterns

### Anti-Pattern 1: Unsanitized Markdown / HTML Rendering & `javascript:` Link Injection

```tsx
// BAD: Rendering raw markdown HTML or unvalidated user link enables immediate XSS
export function UserBio({ rawHtml, websiteUrl }: { rawHtml: string; websiteUrl: string }) {
  return (
    <div>
      <div dangerouslySetInnerHTML={{ __html: rawHtml }} />
      <a href={websiteUrl}>Visit Website</a> {/* Vulnerable to websiteUrl = "javascript:alert(1)" */}
    </div>
  );
}

// GOOD: Sanitize HTML with DOMPurify and enforce http/https protocol allowlist on URLs
import DOMPurify from "dompurify";

function toSafeHttpUrl(raw: string): string {
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : "#";
  } catch {
    return "#";
  }
}

export function UserBioSafe({ rawHtml, websiteUrl }: { rawHtml: string; websiteUrl: string }) {
  const cleanHtml = DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } });
  return (
    <div>
      <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />
      <a href={toSafeHttpUrl(websiteUrl)} target="_blank" rel="noopener noreferrer">Visit Website</a>
    </div>
  );
}
```

### Anti-Pattern 2: Unverified `window.postMessage` Listener & Open Redirect

```typescript
// BAD: Accepts postMessage from any malicious iframe/tab and redirects to protocol-relative "//evil.com"
window.addEventListener("message", (event) => {
  if (event.data?.type === "AUTH_COMPLETE") {
    window.location.href = event.data.redirectUrl; // Open redirect & XSS vector
  }
});

// GOOD: Strict origin verification, schema parsing, and same-origin relative path enforcement
const TRUSTED_ORIGINS = new Set(["https://auth.example.com"]);

function isSafeRelativePath(pathStr: string): boolean {
  return pathStr.startsWith("/") && !pathStr.startsWith("//") && !pathStr.startsWith("/\\");
}

window.addEventListener("message", (event) => {
  if (!TRUSTED_ORIGINS.has(event.origin)) return;
  if (event.data?.type === "AUTH_COMPLETE" && typeof event.data.redirectPath === "string") {
    const target = isSafeRelativePath(event.data.redirectPath) ? event.data.redirectPath : "/dashboard";
    window.location.assign(target);
  }
});
```

## Failure Modes & Mitigations

| Failure Mode | Root Cause | Mitigation |
| :--- | :--- | :--- |
| **Stored DOM XSS** | Rendering user-supplied Markdown/HTML or SVG without DOMPurify sanitization. | Sanitize all raw HTML via `DOMPurify.sanitize` before DOM insertion. |
| **Cross-Origin State Hijack** | `message` listener processes `event.data` without checking `event.origin`. | Check `TRUSTED_ORIGINS.has(event.origin)` on the first line of the handler. |
| **OAuth Token Phishing via Open Redirect** | Redirect handler checks `url.startsWith("/")` which passes `//attacker.com`. | Reject paths starting with `//` or `/\`, or parse with `new URL(input, window.origin)` and assert `parsed.origin === window.origin`. |
