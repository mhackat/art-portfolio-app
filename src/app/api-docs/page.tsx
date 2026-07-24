import spec from "@/generated/openapi.json";
import ReactSwagger from "./ReactSwagger";

export default function ApiDocsPage() {
  return (
    <section className="container mx-auto">
      <ReactSwagger spec={spec} />
    </section>
  );
}
