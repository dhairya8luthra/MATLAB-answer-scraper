export interface Author {
    name: string;
    uri: string;
  }
  
  export interface Question {
    id: string;
    title: string;
    published: string;
    updated: string;
    link: string;
    content: string;
    author: Author | null;
  }