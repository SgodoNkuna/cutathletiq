import * as React from "react";
import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/sonner";
import { DevErrorBoundary } from "@/components/DevErrorBoundary";
import { InstallBanner } from "@/components/InstallBanner";
import { UpdatePrompt } from "@/components/UpdatePrompt";
import { RuntimeErrorFallback } from "@/components/RuntimeErrorFallback";

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

const SITE_NAME = "CUT Athletiq";
const SITE_URL = "https://cutathletiq.lovable.app";
const SITE_DESC = "Sport-performance platform connecting CUT athletes, coaches and physios — training plans, wellness check-ins, injury tracking and game-day readiness in one place.";
const SITE_SUMMARY = "CUT Athletiq is the Central University of Technology's sport-performance app. Athletes log wellness, coaches publish programmes, physios track injuries and return-to-play.";
const OG_IMAGE = "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/ee4341dd-fa6b-4f20-9971-52437bbae277";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: SITE_NAME },
      { name: "description", content: SITE_DESC },
      { name: "author", content: "CUT Sports Department" },
      // AI summary metadata for LLM crawlers / answer engines.
      { name: "ai-summary", content: SITE_SUMMARY },
      { name: "summary", content: SITE_SUMMARY },
      // Open Graph
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:title", content: SITE_NAME },
      { property: "og:description", content: SITE_DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:alt", content: "CUT Athletiq — sport-performance platform" },
      // Twitter
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: SITE_NAME },
      { name: "twitter:description", content: SITE_DESC },
      { name: "twitter:image", content: OG_IMAGE },
      // PWA / theme
      { name: "theme-color", content: "#003478" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: SITE_NAME },
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
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: SITE_NAME,
          url: SITE_URL,
          logo: `${SITE_URL}/icon-512.png`,
          description: SITE_DESC,
          parentOrganization: {
            "@type": "CollegeOrUniversity",
            name: "Central University of Technology",
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          url: SITE_URL,
          description: SITE_DESC,
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  errorComponent: RuntimeErrorFallback,
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
  // Startup health check is admin-gated and surfaced on /system-status and
  // /admin/invites. Do not call it from the root — it would 403 for every
  // unauthenticated visitor and crash SSR/initial render.



  return (
    <DevErrorBoundary>
      <AuthProvider>
        <Outlet />
        <InstallBanner />
        <UpdatePrompt />
        <Toaster position="top-center" />
      </AuthProvider>
    </DevErrorBoundary>
  );
}
