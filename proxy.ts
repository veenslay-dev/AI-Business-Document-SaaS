import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that require a signed-in user. Everything else is public.
const PROTECTED = [
  "/dashboard", "/clients", "/projects", "/proposals", "/quotations", "/invoices", "/admin",
  "/seo-audits", "/social-audits", "/templates", "/brand-kit", "/team", "/settings", "/onboarding", "/search",
];

export async function proxy(request: NextRequest) {
  // Lets the root layout write a canonical URL that points at the page itself, query string left out.
  request.headers.set("x-pathname", request.nextUrl.pathname);
  let response = NextResponse.next({ request });

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(list) {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const signedIn = !!data?.claims;
  const path = request.nextUrl.pathname;

  const isProtected = PROTECTED.some((p) => path === p || path.startsWith(`${p}/`));
  if (isProtected && !signedIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  // Signed-in visitors are sent away from the sign-in pages by the pages themselves. The token check here
  // can't tell that an account was paused, and redirecting would loop with the dashboard's own check.
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
