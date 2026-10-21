/**
 * Helper untuk menentukan base URL situs secara konsisten dan aman,
 * baik di sisi client (browser) maupun server (Next.js route handler/middleware),
 * serta mencegah redirect ke localhost saat di-deploy ke production.
 */
export function getSiteUrl(request?: Request): string {
  // 1. Cek variabel lingkungan (diset oleh developer atau hosting provider)
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  // 2. Jika dipanggil di server dengan objek Request
  if (request) {
    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto =
      request.headers.get("x-forwarded-proto") || "https";

    if (forwardedHost) {
      // Jika di production tapi forwardedHost masih localhost, prioritaskan envUrl
      if (
        process.env.NODE_ENV === "production" &&
        forwardedHost.includes("localhost") &&
        envUrl
      ) {
        return envUrl.replace(/\/+$/, "");
      }
      return `${forwardedProto}://${forwardedHost}`.replace(/\/+$/, "");
    }

    const host = request.headers.get("host");
    if (host) {
      if (
        process.env.NODE_ENV === "production" &&
        host.includes("localhost") &&
        envUrl
      ) {
        return envUrl.replace(/\/+$/, "");
      }
      const proto =
        host.includes("localhost") || host.includes("127.0.0.1")
          ? "http"
          : "https";
      return `${proto}://${host}`.replace(/\/+$/, "");
    }

    try {
      const parsedUrl = new URL(request.url);
      if (
        process.env.NODE_ENV === "production" &&
        parsedUrl.hostname === "localhost" &&
        envUrl
      ) {
        return envUrl.replace(/\/+$/, "");
      }
      return parsedUrl.origin.replace(/\/+$/, "");
    } catch {
      // fallback
    }
  }

  // 3. Jika dipanggil di client browser
  if (typeof window !== "undefined" && window.location) {
    const origin = window.location.origin;
    if (
      process.env.NODE_ENV === "production" &&
      origin.includes("localhost") &&
      envUrl
    ) {
      return envUrl.replace(/\/+$/, "");
    }
    return origin.replace(/\/+$/, "");
  }

  // 4. Fallback ke envUrl atau localhost
  if (envUrl) {
    return envUrl.replace(/\/+$/, "");
  }

  return "http://localhost:3000";
}
