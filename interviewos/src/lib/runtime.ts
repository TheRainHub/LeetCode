/** True inside the Cloudflare Workers runtime (workerd), where `navigator.userAgent` is fixed. */
export function isCloudflareWorker(): boolean {
  return typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";
}

/** True on a hosted deployment, where the app must not run without access control. */
export function isHostedDeployment(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.VERCEL) || isCloudflareWorker();
}
