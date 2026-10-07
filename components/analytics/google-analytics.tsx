import Script from "next/script";
import { gaId, gtmId } from "@/lib/analytics";

/**
 * Where the site's measurement tags live. They are added to the public marketing pages only. The page address goes to
 * Google with every visit, so none of this may run on shared document links, invite links or inside the signed-in app,
 * where addresses contain private tokens and record IDs. Consent starts with advertising storage off.
 */
const CONSENT = "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});";

/** The Google tag (GA4), loaded directly. */
export function GoogleAnalytics() {
  const id = gaId();
  if (!id) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">{`${CONSENT}gtag('js',new Date());gtag('config','${id}');`}</Script>
    </>
  );
}

/** Google Tag Manager: the loader script, and the no-script frame that Google asks for at the top of the body. */
export function GoogleTagManager() {
  const id = gtmId();
  if (!id) return null;
  return (
    <>
      <noscript dangerouslySetInnerHTML={{ __html: `<iframe src="https://www.googletagmanager.com/ns.html?id=${id}" height="0" width="0" style="display:none;visibility:hidden"></iframe>` }} />
      <Script id="google-tag-manager" strategy="afterInteractive">{`${CONSENT}(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${id}');`}</Script>
    </>
  );
}

/** Everything measurement-related for a marketing page. Renders nothing outside production. */
export function Analytics() {
  return (
    <>
      <GoogleTagManager />
      <GoogleAnalytics />
    </>
  );
}
