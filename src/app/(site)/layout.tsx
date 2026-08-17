import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Everything under src/app/(site)/... — Home, How It Works, Shop, About,
// Contact, etc. — gets this Header + Footer automatically. Routes outside
// this group (e.g. (merchantsidebar)/dashboard/...) are unaffected, since
// route groups don't nest into each other's layouts.
export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header />
      <main className="flex-grow">{children}</main>
      <Footer />
    </>
  );
}