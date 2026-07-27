import type { Metadata } from "next";
import TourContent from "@/components/tour/TourContent";

export const metadata: Metadata = {
  title: "Technical tour — Art Portfolio",
  description:
    "How this platform is built and how it's tested: architecture, authorization, a generated API contract, and an independent test suite that gates every deploy.",
};

/** Public — no session required. Everything on this page is a description of
 * how the system is put together; nothing here is gated or environment-specific. */
export default function TourPage() {
  return <TourContent />;
}
