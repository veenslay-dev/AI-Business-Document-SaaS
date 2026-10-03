import { A, LegalPage, P, UL, type LegalSection } from "@/components/marketing/legal-page";
import { PRODUCT_NAME } from "@/components/ui/logo";
import { operator } from "@/lib/legal";
import { pageMetadata } from "@/lib/seo/pages";

export const generateMetadata = () => pageMetadata("/terms");

export default function TermsPage() {
  const op = operator();
  const sections: LegalSection[] = [
    { id: "agreement", title: "Who these terms are between", body: <>
      <P>These terms are an agreement between you and {op.name} ("we", "us"), who operates {PRODUCT_NAME} at this website. By creating an account or using the service you agree to them. If you are using {PRODUCT_NAME} for a company, you confirm you have the authority to accept these terms for that company.</P>
      <P>If you do not agree, please do not use the service. Our <A href="/privacy">Privacy Policy</A> and <A href="/refund-policy">Refund Policy</A> form part of this agreement.</P></> },
    { id: "service", title: "What the service does", body: <>
      <P>{PRODUCT_NAME} lets you create branded proposals, quotations, invoices, SEO audits and social media audits, edit them, export them as PDF, share them through private links, track when a link is opened, and collect a client's response. It also offers AI drafting help.</P>
      <P>It is a tool for preparing and sending documents. We are not a party to any agreement between you and your clients, and we do not review, approve or guarantee what you send.</P></> },
    { id: "eligibility", title: "Who can use it", body: <P>You must be at least 18 and able to enter a binding contract. The service is meant for business use. You must give accurate information when you sign up and keep it up to date.</P> },
    { id: "account", title: "Your account and workspace", body: <>
      <UL items={[
        "Keep your password private. You are responsible for what happens under your account, including actions taken by people you invite to your workspace.",
        "The person who owns a workspace controls who joins it and what role they have. Owners and admins can change the plan, invite or remove people, and see the workspace's documents.",
        "Tell us promptly through the Contact page if you think someone has accessed your account without permission.",
        "One person should not share a login with others. Invite them as team members instead, within the limit of your plan."]} />
      </> },
    { id: "plans", title: "Plans, prices and payment", body: <>
      <P>There is a Free plan and paid plans. What each plan includes, such as documents per month, AI actions per month and team members, is shown on the <A href="/pricing">pricing page</A>. The Free plan has no charge and needs no card.</P>
      <UL items={[
        "Prices are shown and charged in Indian rupees (INR). The amount shown at checkout is the amount you pay.",
        "Paid plans are bought for a fixed period, one month or one year. We do not renew automatically and we do not store your card or UPI details. When the period ends, the workspace returns to the Free plan's limits unless you pay again.",
        "If you pay for the same plan again before it ends, the new period is added to the end of the current one.",
        "If you buy a higher plan while another paid plan is still running, the higher plan starts straight away and the unused time on the earlier plan is not carried over. Contact us before you buy if that matters to you.",
        "Payments are handled by Razorpay. Their terms and privacy policy apply to the payment itself.",
        "Refunds are covered in the Refund Policy."]} />
      <P>"Unlimited documents" on a plan is subject to fair use. We may contact you if usage is far beyond what a normal business needs, such as automated bulk creation.</P>
      <P>We may change plan limits or prices in future. A change will not reduce what you have already paid for during your current paid period, and we will show new prices before you buy.</P></> },
    { id: "content", title: "Your content", body: <>
      <P>Your content means everything you put into the service: client records, document text, line items, logos, images and files. You own it. We do not claim any ownership of it.</P>
      <P>You give us permission to store, process, display and transmit your content only as needed to run the service for you. That includes producing PDFs, showing a shared document to the people you send the link to, and sending the text you ask the AI to work on to our AI provider.</P>
      <UL items={[
        "You are responsible for your content, including that it is accurate, lawful, and that you have the right to use it.",
        "If your content includes personal information about your clients or their staff, you are responsible for having a lawful basis to use it and to share it with us for processing. For that data you decide why and how it is used, and we act on your instructions.",
        "Do not upload content that infringes someone else's rights or that you are not allowed to share."]} />
      </> },
    { id: "ai", title: "AI features", body: <>
      <P>AI drafts, rewrites and summaries are generated automatically and can be wrong, incomplete or out of date. They are a starting point. You must read and check everything before you send it to a client. You are responsible for the documents you send.</P>
      <P>AI output is not legal, tax, financial or professional advice. Audit reports describe what a scan or a checklist found at that moment. They are not a guarantee about how a website will perform or rank.</P>
      <P>Each plan includes a number of AI actions per month. Actions that fail on our side are not counted. Unused actions do not roll over.</P></> },
    { id: "sharing", title: "Shared links and client responses", body: <>
      <P>When you share a document, anyone who has the link can open it. Send links only to the people you mean to. You can turn a link off at any time from the document.</P>
      <P>When a client accepts, declines or comments, we record what they entered along with the time. This is a record of that response. Whether it is enough to form a binding contract depends on your circumstances and the law that applies to you. For high value or sensitive deals, take your own legal advice and do not rely on {PRODUCT_NAME} alone.</P></> },
    { id: "acceptable-use", title: "Acceptable use", body: <>
      <P>You agree not to:</P>
      <UL items={[
        "use the service for anything unlawful, fraudulent, misleading or abusive;",
        "send spam, malware or content that harasses or defames anyone;",
        "try to access another company's workspace or data, probe or test our security without our written permission, or interfere with the service working normally;",
        "use the SEO audit to scan websites you have no right to check, or to attack, overload or scrape a site;",
        "use automated tools to create accounts or to push usage far beyond normal business use;",
        "copy, resell or offer the service itself to others as your own product without our written agreement."]} />
      <P>If you break these rules we may remove content, pause your workspace or close your account.</P></> },
    { id: "availability", title: "Availability and changes", body: <>
      <P>We work to keep the service running but we do not promise it will always be available or free of errors. We may carry out maintenance, add features, change or retire features, and update the service. Please keep your own copies of anything important, for example by downloading PDFs.</P></> },
    { id: "suspension", title: "Suspension and ending your account", body: <>
      <P>You can stop using the service at any time. To have your account and data deleted, write to us through the <A href="/contact">Contact page</A> from the email address on the account.</P>
      <P>We may pause or close an account if you break these terms, if a payment is reversed or disputed, if we are required to by law, or if the account looks like it has been compromised. Where it is reasonable and safe, we will tell you why. Closing an account does not remove your obligation to pay anything already due.</P></> },
    { id: "ip", title: "Our property", body: <P>The service, including its software, templates, design and the {PRODUCT_NAME} name and logo, belongs to us or our licensors. You may use it as these terms allow. Documents you create with the templates are yours to use for your business.</P> },
    { id: "warranty", title: "No warranties", body: <P>To the extent the law allows, the service is provided "as is" and "as available". We do not promise that it will meet every need, produce particular business results, win you clients, or be uninterrupted or error free. Nothing in these terms takes away rights you have under consumer law that cannot be excluded.</P> },
    { id: "liability", title: "Limit of our liability", body: <>
      <P>To the extent the law allows, we are not liable for indirect or consequential loss, or for lost profits, lost business, lost clients or lost data, arising from your use of the service, including from AI output or from a document you sent.</P>
      <P>Our total liability to you for any claim related to the service is limited to the amount you paid us for the service in the 12 months before the event that gave rise to the claim, or ₹1,000 if you have only used the Free plan. Nothing here limits liability that cannot lawfully be limited, such as liability for fraud.</P></> },
    { id: "indemnity", title: "If a claim is made against us", body: <P>If a third party makes a claim against us because of content you uploaded or documents you sent, or because you broke these terms or the law, you agree to cover our reasonable losses from that claim, including reasonable legal costs, provided we tell you promptly and let you take part in dealing with it.</P> },
    { id: "changes", title: "Changes to these terms", body: <P>We may update these terms. We will change the date at the top of the page, and for changes that matter we will also tell account owners by email or inside the app. If you keep using the service after a change takes effect, you accept the updated terms. If you disagree, you can stop using the service and ask us to close your account.</P> },
    { id: "law", title: "Governing law and disputes", body: <>
      <P>These terms are governed by the laws of India. Please contact us first so we can try to resolve any issue informally. If that does not work, the courts of competent jurisdiction in {op.city || "India"} will have jurisdiction, subject to any rights you have as a consumer to bring a claim in another court where the law gives you that right.</P></> },
  ];
  return <LegalPage current="/terms" title="Terms of Service" sections={sections} intro={<P>Please read these terms before you use {PRODUCT_NAME}. They explain what you can expect from us, what we expect from you, and how plans and payments work. We have tried to keep them plain, but if anything is unclear, ask us through the <A href="/contact">Contact page</A> before you sign up or pay.</P>} />;
}
