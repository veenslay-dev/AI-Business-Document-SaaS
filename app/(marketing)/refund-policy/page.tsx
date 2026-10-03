import { A, LegalPage, P, UL, type LegalSection } from "@/components/marketing/legal-page";
import { PRODUCT_NAME } from "@/components/ui/logo";
import { pageMetadata } from "@/lib/seo/pages";

export const generateMetadata = () => pageMetadata("/refund-policy");

export default function RefundPolicyPage() {
  const sections: LegalSection[] = [
    { id: "free", title: "The Free plan", body: <P>The Free plan costs nothing, so there is nothing to refund. You can use it as long as you like within its limits and upgrade only when you are ready.</P> },
    { id: "how-it-works", title: "How paid plans work", body: <P>Paid plans are bought for one month or one year at a time and paid in advance in Indian rupees. They do not renew automatically, so there is no subscription to cancel and we will never charge you again without you choosing to pay. When the period ends, your workspace goes back to the Free plan's limits. Your documents stay in your account.</P> },
    { id: "eligible", title: "When you can get a refund", body: <>
      <UL items={[
        <><strong>Within 7 days of your first payment.</strong> If you paid for a plan for the first time and it is not right for you, ask us within 7 days of the payment and we will refund it in full, as long as the plan has not been used heavily or in a way that breaks our <A href="/terms">Terms of Service</A>. Because AI actions cost us money every time they run, we may keep back the cost of AI actions used beyond the Free plan's allowance if the account has used a large share of them.</>,
        <><strong>Charged by mistake.</strong> If you were charged twice for the same purchase, charged the wrong amount, or charged and the plan was not switched on, we will refund the amount in full, or fix the plan, whichever you prefer. There is no time limit beyond asking us within a reasonable period of noticing.</>,
        <><strong>A fault on our side.</strong> If a serious problem on our side stops you from using what you paid for for a significant part of the period, and we cannot fix it, we will refund the part of the payment that covers the lost time.</>]} /></> },
    { id: "not-eligible", title: "When we cannot refund", body: <>
      <UL items={[
        "payments for an extension or repeat purchase, after the first 7 days from that payment;",
        "payments for a yearly plan after the first 7 days, even if you stop using the service part way through;",
        "when you simply change your mind after using the plan for most of its period;",
        "a workspace paused or closed because of a breach of the Terms of Service, misuse or a payment dispute;",
        "if you bought a higher plan while another paid plan was still running. The higher plan starts straight away and the unused time on the earlier one is not credited. If that matters to you, contact us before you pay and we will work out the best option."]} />
      <P>These limits do not take away any right you have under consumer protection law that cannot be waived.</P></> },
    { id: "request", title: "How to ask for a refund", body: <>
      <P>Use the <A href="/contact">Contact page</A> from the email address on your account, choose the general topic, and include:</P>
      <UL items={["the email address on your account;", "the plan you bought and the date;", "the Razorpay payment ID if you have it (it is in the payment confirmation email you received from Razorpay);", "a short note on why you are asking."]} />
      <P>We usually reply within one working day. If your request is approved, we start the refund within 5 working days.</P></> },
    { id: "timing", title: "How and when the money returns", body: <P>Refunds go back to the same card, UPI account or bank account that made the payment, through Razorpay. After we start a refund, banks and card networks usually take 5 to 10 working days to show it. We cannot speed that part up. If it has not arrived after 10 working days, send us the payment ID and we will check with Razorpay.</P> },
    { id: "after", title: "After a refund", body: <P>When we refund a payment, we switch the workspace back to the Free plan unless you tell us otherwise. Your documents and clients stay in your account, but the Free plan's limits apply again. You can buy a paid plan again at any time.</P> },
    { id: "changes", title: "Changes", body: <P>We may update this policy. The date at the top shows the last change. A change applies to payments made after it, so the policy that was on this page on the day you paid is the one that applies to that payment.</P> },
  ];
  return <LegalPage current="/refund-policy" title="Refund Policy" sections={sections} intro={<P>We want you to be comfortable paying for {PRODUCT_NAME}. This page says plainly when we refund a payment, how to ask, and what to expect. Prices and plan limits are on the <A href="/pricing">pricing page</A>.</P>} />;
}
