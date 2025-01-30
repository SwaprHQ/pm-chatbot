import React from "react";
import ReactMarkdown, { Components } from "react-markdown";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

interface MarkdownStyles {
  container: string;
  heading: {
    h1: string;
    h2: string;
    h3: string;
  };
  paragraph: string;
  list: string;
  listItem: string;
  code: string;
  preBlock: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = "",
}) => {
  // Sample styles for basic markdown elements
  const markdownStyles: MarkdownStyles = {
    container: "prose dark:prose-invert",
    heading: {
      h1: "text-4xl font-bold my-4",
      h2: "text-3xl font-bold my-3",
      h3: "text-2xl font-bold my-2",
    },
    paragraph: "my-2",
    list: "list-disc list-inside my-2",
    listItem: "ml-4",
    code: "bg-gray-100 dark:bg-gray-800 rounded px-1",
    preBlock: "bg-gray-100 dark:bg-gray-800 p-4 rounded my-4 overflow-x-auto",
  };

  // Custom components for markdown elements
  const components: Components = {
    h1: ({ children }) => (
      <h1 className={markdownStyles.heading.h1}>{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className={markdownStyles.heading.h2}>{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className={markdownStyles.heading.h3}>{children}</h3>
    ),
    p: ({ children }) => <p className={markdownStyles.paragraph}>{children}</p>,
    ul: ({ children }) => <ul className={markdownStyles.list}>{children}</ul>,
    li: ({ children }) => (
      <li className={markdownStyles.listItem}>{children}</li>
    ),
    // code: ({ inline, className, children }) => {
    //   const isInline = inline ?? false;
    //   return isInline ? (
    //     <code className={markdownStyles.code}>{children}</code>
    //   ) : (
    //     <pre className={markdownStyles.preBlock}>
    //       <code className={className}>{children}</code>
    //     </pre>
    //   );
    // },
  };

  return (
    <div className={`${markdownStyles.container} ${className}`.trim()}>
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
