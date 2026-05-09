import * as React from "react";
import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/sonner";
import { DevErrorBoundary } from "@/components/DevErrorBoundary";
import { InstallBanner } from "@/components/InstallBanner";
import { checkStartupHealth } from "@/lib/server/startup.functions";
import { toast } from "sonner";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl text-navy">404</h1>
        <h2 className="mt-2 text-xl font-semibold">Off the field</h2>
        <p className="mt-2 text-sm text-muted-foreground">That page doesn't exist.</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-navy px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-navy-deep"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "CUT Athletiq" },
      {
        name: "description",
        content:
          "Sport-performance app for athletes, coaches and physios at the Central University of Technology.",
      },
      { name: "author", content: "CUT Sports Department" },
      { property: "og:title", content: "CUT Athletiq" },
      {
        property: "og:description",
        content: "Sport-performance app for athletes, coaches and physios at CUT.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "CUT Athletiq" },
      {
        name: "twitter:description",
        content: "Sport-performance app for athletes, coaches and physios at CUT.",
      },
      { name: "description", content: "A sports team management app for coaches, athletes, and physios." },
      { property: "og:description", content: "A sports team management app for coaches, athletes, and physios." },
      { name: "twitter:description", content: "A sports team management app for coaches, athletes, and physios." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/ee4341dd-fa6b-4f20-9971-52437bbae277" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/ee4341dd-fa6b-4f20-9971-52437bbae277" },
      { name: "theme-color", content: "#003478" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "CUT Athletiq" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icon-512.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  // One-shot startup health check. Surfaces a clear toast if a required
  // server-side secret (e.g. ADMIN_INVITE_CODE) is missing so the operator
  // notices immediately. Detailed view lives at /system-status.
  React.useEffect(() => {
    let cancelled = false;
    void checkStartupHealth()
      .then((res) => {
        if (cancelled || res.ok) return;
        const issues = [...res.missing, ...res.missingCodes.map((r) => `${r}_invite_code`)];
        console.error(`[startup] Missing required configuration: ${issues.join(", ")}`);
        toast.error(`Missing config: ${issues.join(", ")}`, {
          duration: 12_000,
          description: "Open /system-status for details.",
          action: {
            label: "Details",
            onClick: () => {
              window.location.href = "/system-status";
            },
          },
        });
      })
      .catch((e) => console.warn("[startup] health check failed", e));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DevErrorBoundary>
      <AuthProvider>
        <Outlet />
        <InstallBanner />
        <Toaster position="top-center" />
      </AuthProvider>
    </DevErrorBoundary>
  );
}
