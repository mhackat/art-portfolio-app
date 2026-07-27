import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "Art Portfolio",
  description: "A portfolio and gallery site for artists.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900">
        {/* Scroll-reveal animations start every element at opacity 0 and rely on
            an IntersectionObserver to bring them in. With scripting unavailable
            that observer never runs, which would leave those pages blank — so
            when there's no JS, opt out of the hidden starting state. Styles
            inside <noscript> apply only in exactly that case, so this costs
            nothing in the normal path and can't flash. */}
        <noscript>
          <style
            dangerouslySetInnerHTML={{
              __html:
                ".reveal,.tour-rule,.reveal-words .word{opacity:1!important;transform:none!important}",
            }}
          />
        </noscript>
        <Providers>
          <Nav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
