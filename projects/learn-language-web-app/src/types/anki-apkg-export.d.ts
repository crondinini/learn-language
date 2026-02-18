declare module "anki-apkg-export" {
  interface TemplateOptions {
    questionFormat?: string;
    answerFormat?: string;
    css?: string;
  }

  interface CardOptions {
    tags?: string | string[];
  }

  class Exporter {
    addCard(front: string, back: string, options?: CardOptions): void;
    addMedia(filename: string, data: Buffer): void;
    save(): Promise<Buffer>;
  }

  export default function AnkiExport(
    deckName: string,
    template?: TemplateOptions
  ): Exporter;
}
