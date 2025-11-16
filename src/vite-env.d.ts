/// <reference types="vite/client" />

// Add support for ?raw imports
declare module '*.sql?raw' {
  const content: string;
  export default content;
}

declare module '*.txt?raw' {
  const content: string;
  export default content;
}
