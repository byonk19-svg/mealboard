import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resolveLoginReturnPath } from "@/lib/auth/return-path";
import { getSupabaseBrowserEnv } from "@/lib/supabase/env";

export async function updateSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(
    "x-mealboard-path",
    `${request.nextUrl.pathname}${request.nextUrl.search}`
  );
  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders }
  });
  const { supabaseUrl, supabaseAnonKey } = getSupabaseBrowserEnv();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        supabaseResponse = NextResponse.next({
          request: { headers: requestHeaders }
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });

        Object.entries(headers).forEach(([key, value]) => {
          supabaseResponse.headers.set(key, value);
        });
      }
    }
  });

  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData && isProtectedAppPath(request.nextUrl.pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set(
      "returnTo",
      resolveLoginReturnPath(`${request.nextUrl.pathname}${request.nextUrl.search}`)
    );
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

function isProtectedAppPath(pathname: string) {
  return (
    pathname === "/dashboard" ||
    pathname === "/grocery-list" ||
    pathname === "/plan-week" ||
    pathname === "/recipes" ||
    pathname.startsWith("/recipes/") ||
    pathname === "/settings" ||
    pathname.startsWith("/settings/") ||
    pathname.startsWith("/weekly-wrap-up/")
  );
}
