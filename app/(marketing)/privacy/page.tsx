import { A, LegalPage, P, UL, type LegalSection } from "@/components/marketing/legal-page";
import { PRODUCT_NAME } from "@/components/ui/logo";
import { operator } from "@/lib/legal";
import { pageMetadata } from "@/lib/seo/pages";

export const generateMetadata = () => pageMetadata("/privacy");

export default function PrivacyPage() {
  const op = operator();
  const sections: LegalSection[] = [
    { id: "who", title: "Who we are", body: <P>{PRODUCT_NAME} is operated by {op.name}. For the information described in this policy, we decide why and how it is used, except where we say otherwise in section 3. You can reach us through the <A href="/contact">Contact page</A>.</P> },
    { id: "collect", title: "What we collect", body: <>
      <UL items={[
        <><strong>Account details.</strong> Your name, email address and password. Passwords are stored in a protected, hashed form by our authentication provider. We never see or keep your password in readable form.</>,
        <><strong>Workspace and brand details.</strong> Company name, logo, colors, fonts, address, tax numbers you choose to add, default terms, and the people you invite with their roles.</>,
        <><strong>What you create.</strong> Clients, documents, line items, uploaded images and files, and the text you give the AI assistant to work on.</>,
        <><strong>Activity on shared links.</strong> When someone opens a document you shared, we record the time, the browser type, and a one-way scrambled version of their IP address. We do not store the plain IP address for this. When a client accepts, declines or asks for changes, we record what they typed, such as their name, a comment and a typed signature, and the time.</>,
        <><strong>Messages to us.</strong> What you write in the contact form (name, email, topic and message), plus a scrambled form of your IP address that we use to limit spam.</>,
        <><strong>Payment records.</strong> The plan, amount, status, and the order and payment reference numbers from Razorpay. Your card, UPI or bank details go to Razorpay and are never seen or stored by us.</>,
        <><strong>Usage records.</strong> How many documents and AI actions your workspace has used, and the technical size of each AI request, so we can enforce plan limits and understand running costs.</>,
        <><strong>Website analytics.</strong> On our public pages (such as the home, pricing, template, about and contact pages) Google Analytics, which we load through Google Tag Manager, records which pages are viewed, roughly where in the world the visit comes from, the device and browser type, and how the visitor arrived. It uses cookies to tell visits apart. According to Google, Analytics 4 does not store IP addresses. We do not run it inside the app or on shared document links.</>,
        <><strong>Technical logs.</strong> Our hosting and database providers keep ordinary server logs such as request times, errors and IP addresses for security and troubleshooting.</>]} />
      <P>We do not knowingly ask for sensitive personal data such as health information or government ID numbers. Please do not put that kind of data into the service.</P></> },
    { id: "roles", title: "Your clients' information", body: <P>If you put information about your own clients into {PRODUCT_NAME}, such as contact names, emails and phone numbers, that information belongs to your business. You decide why it is used. We store and process it on your behalf, to provide the service to you, and we do not use it for our own marketing. You are responsible for having a proper basis to collect it and to share it with us, and for telling your clients how you use it.</P> },
    { id: "use", title: "How we use information", body: <>
      <UL items={[
        "to create your account, run your workspace and provide the features you use;",
        "to generate PDFs, show shared documents to the people you send them to, and tell you when they were opened or answered;",
        "to process payments, activate plans and keep records of what was bought;",
        "to apply plan limits and to work out the cost of running the AI features;",
        "to reply to messages, give support and send service emails such as sign in, password reset and security notices;",
        "to keep the service secure, prevent abuse and fix problems;",
        "to meet our legal and accounting obligations."]} />
      <P>We do not sell your personal information. We do not use it for advertising or share it with advertisers.</P></> },
    { id: "ai", title: "How the AI features use your information", body: <>
      <P>When you use an AI action, the text needed for that request is sent to our AI provider, which is OpenAI or Anthropic depending on how the service is set up. That can include your brief, parts of a document, and your company and client names where they are part of the request. The provider returns a draft, which is saved in your workspace.</P>
      <P>Only send what you are comfortable sending. The provider handles that text under its own terms and privacy policy. We do not send your password, payment details or files unrelated to the request.</P></> },
    { id: "share", title: "Who else handles your information", body: <>
      <P>We use a small number of service providers to run {PRODUCT_NAME}. They only get what they need to do their job:</P>
      <UL items={[
        "Supabase, for our database, sign in and file storage;",
        "Vercel, for hosting the website and application;",
        "Razorpay, for taking payments;",
        "OpenAI or Anthropic, for the AI features, as explained above;",
        "Google Analytics and Google Tag Manager, to understand how the public pages are used;",
        "an email delivery service, for sign in and account emails sent on our behalf."]} />
      <P>We may also share information if the law requires it, to respond to a valid legal request, to protect the rights or safety of our users or us, or as part of a sale or restructuring of the business, in which case this policy would continue to apply to your information unless we tell you of a change.</P>
      <P>Anything you choose to share through a link is visible to whoever has that link.</P></> },
    { id: "transfers", title: "Where information is stored", body: <P>Our providers run servers in several countries, so your information may be processed outside India. We choose established providers and rely on their security commitments, but the laws of those countries may differ from the laws of India.</P> },
    { id: "cookies", title: "Cookies", body: <><P>The service sets two cookies it needs to work: one keeps you signed in, and another remembers which workspace you were using.</P><P>On the public pages, Google Analytics also sets its own cookies (their names start with _ga) to measure visits. We use Google Tag Manager to manage these measurement tags. We have turned off Google's advertising features, and we do not use advertising cookies or share analytics data for ads. If that ever changes, we will update this policy first. Neither Analytics nor Tag Manager is loaded inside the signed-in app or on shared document and invite links. You can block or delete cookies in your browser settings, or install Google's Analytics opt-out add-on. Blocking the sign-in cookie means you will not be able to sign in.</P></> },
    { id: "keep", title: "How long we keep it", body: <>
      <UL items={[
        "Account and workspace content is kept while your account is open.",
        "When you ask us to delete your account, we delete your workspace content and account details. Copies in backups are overwritten on the normal backup cycle.",
        "Payment records and anything we must keep for tax, accounting or legal reasons are kept for as long as the law requires, even after your account is closed.",
        "Contact messages are kept for as long as needed to deal with your request and to keep a record of it."]} /></> },
    { id: "security", title: "How we protect it", body: <>
      <P>Data travels over encrypted connections. Each company's records are separated inside the database so one customer cannot read another's. Passwords are hashed, IP addresses in sharing records are scrambled, and administrator access is restricted. We limit who on our side can see account data and only use it to run and support the service.</P>
      <P>No system is perfectly secure and we cannot promise that it will never be breached. If a breach affects your personal information, we will tell you and the authorities as the law requires.</P></> },
    { id: "rights", title: "Your choices and rights", body: <>
      <P>Under the Digital Personal Data Protection Act, 2023 and other applicable law, you can ask us to:</P>
      <UL items={[
        "tell you what personal information we hold about you and how we use it;",
        "correct information that is wrong or incomplete (you can also edit most of it yourself inside the app);",
        "delete your information and close your account;",
        "deal with a complaint about how we have handled your information."]} />
      <P>To make a request, write to us through the <A href="/contact">Contact page</A> from the email address on your account, so we can confirm it is you. We aim to reply within 7 days and to complete a request within 30 days. If you are not satisfied with our answer, you may complain to the Data Protection Board of India once it is operating, or to any authority that has jurisdiction.</P>
      <P>If you are a client who received a document through {PRODUCT_NAME} and want your information removed, contact the business that sent it first, or write to us and we will pass your request on.</P></> },
    { id: "children", title: "Children", body: <P>{PRODUCT_NAME} is a business tool and is not meant for anyone under 18. We do not knowingly collect information from children. If you believe a child has given us information, tell us and we will delete it.</P> },
    { id: "changes", title: "Changes to this policy", body: <P>We may update this policy as the service or the law changes. The date at the top shows when it last changed. For changes that matter, we will also tell account owners by email or in the app.</P> },
  ];
  return <LegalPage current="/privacy" title="Privacy Policy" sections={sections} intro={<P>This policy explains what personal information {PRODUCT_NAME} collects when you use the website and the app, why we collect it, who it is shared with and what choices you have. It applies to people who sign up, to people who contact us, and to clients who open a document that someone has shared with them.</P>} />;
}
