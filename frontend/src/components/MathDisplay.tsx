import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';

interface MathDisplayProps {
  content: string;
}

// 为了解决TypeScript错误，定义组件参数类型
interface CodeProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const MathDisplay: React.FC<MathDisplayProps> = ({ content }) => {
  // 预处理内容，处理各种特殊的LaTeX结构
  const processContent = (text: string) => {
    if (!text) return '';
    
    let processed = text
      // 处理对齐环境
      .replace(/\\begin\{align\*?\}/g, '$$\\begin{aligned}')
      .replace(/\\end\{align\*?\}/g, '\\end{aligned}$$')
      .replace(/\\begin\{align\}/g, '$$\\begin{aligned}')
      .replace(/\\end\{align\}/g, '\\end{aligned}$$')
      
      // 处理cases环境
      .replace(/\\begin\{cases\}/g, '$$\\begin{cases}')
      .replace(/\\end\{cases\}/g, '\\end{cases}$$')
      
      // 处理特殊符号和命令
      .replace(/\\cdot/g, '\\cdot ')
      .replace(/\\frac{dy}{du}/g, '\\frac{dy}{du}')
      .replace(/\\prec/g, '\\prec')
      .replace(/\\text\{(\w+)\}/g, '\\text{$1}')
      
      // 处理内积空间
      .replace(/<H,\s*~>/g, '\\langle H, \\sim \\rangle')
      
      // 处理逻辑符号
      .replace(/\\land/g, '\\land ')
      .replace(/\\lor/g, '\\lor ')
      .replace(/\\Rightarrow/g, '\\Rightarrow ')
      .replace(/\\Leftrightarrow/g, '\\Leftrightarrow ')
      
      // 处理&符号确保正确对齐
      .replace(/&=/g, '&=')
      .replace(/&\\prec/g, '&\\prec');

    // 专门处理内积空间的符号表示
    processed = processed.replace(/(\w+)\s*~\s*(\w+)/g, '$1 \\sim $2');
    
    // 处理可能出现的未闭合美元符号
    let dollarCount = 0;
    for (let i = 0; i < processed.length; i++) {
      if (processed[i] === '$') dollarCount++;
    }
    if (dollarCount % 2 !== 0) {
      // 如果美元符号数量为奇数，添加一个美元符号
      processed += '$';
    }
    
    return processed;
  };

  const processedContent = processContent(content);

  return (
    <div className="math-display">
      <ReactMarkdown
        children={processedContent}
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[[rehypeKatex, { 
          strict: false, 
          output: 'html', 
          throwOnError: false, 
          macros: {
            "\\R": "\\mathbb{R}",
            "\\N": "\\mathbb{N}",
            "\\Z": "\\mathbb{Z}",
            "\\Q": "\\mathbb{Q}",
            "\\H": "\\mathbb{H}",
          },
          trust: true, 
          displayMode: true 
        }], rehypeHighlight]}
        components={{
          h1: ({node, ...props}: any) => <h1 style={{fontSize: '1.5em', fontWeight: 'bold', margin: '16px 0 8px'}} {...props} />,
          h2: ({node, ...props}: any) => <h2 style={{fontSize: '1.3em', fontWeight: 'bold', margin: '14px 0 7px'}} {...props} />,
          h3: ({node, ...props}: any) => <h3 style={{fontSize: '1.1em', fontWeight: 'bold', margin: '12px 0 6px'}} {...props} />,
          p: ({node, ...props}: any) => <p style={{margin: '8px 0'}} {...props} />,
          ul: ({node, ...props}: any) => <ul style={{marginLeft: '20px', listStyleType: 'disc'}} {...props} />,
          ol: ({node, ...props}: any) => <ol style={{marginLeft: '20px'}} {...props} />,
          li: ({node, ...props}: any) => <li style={{margin: '4px 0'}} {...props} />,
          code: ({node, inline, ...props}: CodeProps) => 
            inline ? 
              <code style={{backgroundColor: '#f0f0f0', padding: '2px 4px', borderRadius: '3px', fontSize: '85%'}} {...props} /> :
              <div style={{margin: '10px 0'}}>
                <div style={{backgroundColor: '#f6f8fa', padding: '16px', borderRadius: '8px', overflowX: 'auto'}}>
                  <code style={{fontFamily: 'SFMono-Regular, Consolas, Monaco, monospace'}} {...props} />
                </div>
              </div>,
          pre: ({node, ...props}: any) => <pre style={{margin: '10px 0', whiteSpace: 'pre-wrap'}} {...props} />,
          strong: ({node, ...props}: any) => <strong style={{fontWeight: 'bold'}} {...props} />,
          em: ({node, ...props}: any) => <em style={{fontStyle: 'italic'}} {...props} />,
          blockquote: ({node, ...props}: any) => 
            <blockquote 
              style={{
                borderLeft: '4px solid #dfe2e5', 
                paddingLeft: '16px', 
                margin: '16px 0', 
                color: '#6a737d'
              }} 
              {...props} 
            />,
          table: ({node, ...props}: any) => 
            <div style={{overflowX: 'auto', margin: '16px 0'}}>
              <table 
                style={{
                  borderCollapse: 'collapse',
                  width: '100%',
                  marginBottom: '16px',
                }} 
                {...props} 
              />
            </div>,
          th: ({node, ...props}: any) => 
            <th 
              style={{
                border: '1px solid #dfe2e5',
                padding: '6px 13px',
                background: '#f6f8fa',
                fontWeight: 'bold',
              }} 
              {...props} 
            />,
          td: ({node, ...props}: any) => 
            <td 
              style={{
                border: '1px solid #dfe2e5',
                padding: '6px 13px',
              }} 
              {...props} 
            />,
          a: ({node, ...props}: any) => 
            <a 
              style={{
                color: '#0366d6',
                textDecoration: 'none',
              }} 
              target="_blank"
              rel="noopener noreferrer"
              {...props} 
            />,
          img: ({node, ...props}: any) => 
            <img 
              style={{
                maxWidth: '100%',
                boxSizing: 'content-box',
                background: 'white',
              }}
              alt={props.alt || "数学图片"} 
              {...props} 
            />,
        }}
      />
    </div>
  );
};

export default MathDisplay; 