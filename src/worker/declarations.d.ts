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

declare module '*.json' {
  const value: any;
  export default value;
}

interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}
