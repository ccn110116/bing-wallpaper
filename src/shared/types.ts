export interface BingImage {
  desc: string;
  date: string;
  url: string;
}

export interface Env {
  ASSETS?: {
    fetch: (request: Request) => Promise<Response>;
  };
  __STATIC_CONTENT?: ReadableStream<Uint8Array>;
}
