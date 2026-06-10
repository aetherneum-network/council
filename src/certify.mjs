// Certification: POST a completed session result to a certificate issuer and
// get back a permanent receipt URL. The issuer is expected to validate the
// session's internal consistency, sign the payload (Ed25519), anchor it in a
// transparency ledger, and respond with at least { url } — the open format the
// first issuer (aetherneum.com/cert) serves is documented on its verify page.
//
// Zero dependencies: global fetch (Node >= 18). Network failure here must never
// change the verdict or the exit code — callers treat certification as additive.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const VERSION = (() => {
  try {
    return JSON.parse(
      readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "package.json"), "utf8")
    ).version;
  } catch {
    return "";
  }
})();

export async function requestCertificate(result, endpoint, item = {}, opts = {}) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      result,
      item,
      council_version: opts.version || VERSION,
    }),
    signal: AbortSignal.timeout(opts.timeout || 30000),
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.text()).slice(0, 200);
    } catch {}
    throw new Error(`issuer ${res.status}: ${detail}`);
  }
  const j = await res.json();
  if (!j.url) throw new Error("issuer response missing certificate url");
  return j.url;
}
