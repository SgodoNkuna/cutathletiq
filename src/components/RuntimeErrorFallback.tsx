import { Link, useRouter } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";

function errorMessage(error: unknown) {
  if (error instanceof Response) return `${error.status} ${error.statusText || "Server function failed"}`;
  if (error instanceof Error && error.message && error.message !== "[object Response]") return error.message;
  return "A protected server check failed before the page finished loading.";
}

function looksLikeServerFnError(error: unknown) {
  if (error instanceof Response) return true;
  const text = error instanceof Error ? `${error.name} ${error.message} ${error.stack ?? ""}` : String(error);
  return /_serverFn|\[object Response\]|server function/i.test(text);
}

export function RuntimeErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const serverFnError = looksLikeServerFnError(error);

  console.error("[runtime-error-boundary]", error);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <section role="alert" className="max-w-md rounded-2xl border bg-card p-6 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
        </div>
        <h1 className="font-display text-3xl text-navy">
          {serverFnError ? "Secure check could not finish" : "Something went wrong"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {serverFnError
            ? "Your session or access level was not ready for this protected request. Try again, or sign in again if it continues."
            : "This screen could not load. Try again, or return home."}
        </p>
        {import.meta.env.DEV && (
          <pre className="mt-4 max-h-32 overflow-auto rounded-lg bg-secondary/50 p-3 text-left font-mono text-xs text-muted-foreground">
            {errorMessage(error)}
          </pre>
        )}
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => {
              void router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-full bg-navy px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-navy-deep"
          >
            Try again
          </button>
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-secondary"
          >
            Sign in
          </Link>
        </div>
      </section>
    </main>
  );
}