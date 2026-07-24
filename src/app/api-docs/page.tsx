import { getApiDocs } from "@/lib/swagger";
import ReactSwagger from "./ReactSwagger";

export default async function ApiDocsPage() {
  const spec = getApiDocs();
  return (
    <section className="container mx-auto">
      <ReactSwagger spec={spec} />
    </section>
  );
}
