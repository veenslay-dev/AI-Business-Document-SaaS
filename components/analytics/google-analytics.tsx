import Script from "next/script";
import { gaId } from "@/lib/analytics";

/**
 * The Google tag. It is added to the public marketing pages only. The page address is sent to Google with every visit,
 * so it must never run on shared document links, invite links or inside the signed-in app, where addresses contain
 * private tokens and record IDs. Consent mode starts with advertising storage off, because the site runs no ads.
 */
export function GoogleAnalytics() {
  const id = gaId();
  if (!id) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});gtag('js',new Date());gtag('config','${id}');`}</Script>
    </>
  );
}
