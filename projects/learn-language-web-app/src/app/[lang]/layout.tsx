import { notFound } from "next/navigation";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";
import DictionarySpotlight from "@/components/DictionarySpotlight";

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!SUPPORTED_LANGUAGES[lang]) {
    notFound();
  }
  return (
    <>
      {children}
      <DictionarySpotlight />
    </>
  );
}
