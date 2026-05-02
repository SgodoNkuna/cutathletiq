import * as React from "react";
import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/sonner";
import { DevErrorBoundary } from "@/components/DevErrorBoundary";
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
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e7abf0be-385d-4655-8d37-1ffff2ec471c/id-preview-6ab967c5--4de23600-c8cc-4ba5-b0fa-59af063a1f63.lovable.app-1777163208029.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e7abf0be-385d-4655-8d37-1ffff2ec471c/id-preview-6ab967c5--4de23600-c8cc-4ba5-b0fa-59af063a1f63.lovable.app-1777163208029.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
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
  // notices immediately instead of hitting a confusing runtime error later.
  React.useEffect(() => {
    let cancelled = false;
    void checkStartupHealth()
      .then((res) => {
        if (cancelled || res.ok) return;
        const list = res.missing.join(", ");
        console.error(`[startup] Missing required environment variables: ${list}`);
        toast.error(`Missing server config: ${list}`, {
          duration: 10_000,
          description: "Some features will not work until these are set.",
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
        <Toaster position="top-center" />
      </AuthProvider>
    </DevErrorBoundary>
  );
}
