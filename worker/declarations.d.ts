declare module '*.html' {
  const content: string;
  export default content;
}

declare module '*.css' {
  const content: string;
  export default content;
}

declare module '*.js' {
  const content: string;
  export default content;
}

interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}
