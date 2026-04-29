import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'

interface Props {
  children: string
  className?: string
}

export default function MarkdownContent({ children, className }: Props) {
  return (
    <div className={`prose prose-invert prose-sm max-w-none text-court-gray leading-relaxed ${className ?? ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        components={{
          // eslint-disable-next-line @next/next/no-img-element
          img: ({ src, alt }) => (
            <img src={src ?? ''} alt={alt ?? ''} loading="lazy" className="rounded-md max-w-full" />
          ),
          a: ({ href, children: content }) => (
            <a href={href} target="_blank" rel="noreferrer noopener">{content}</a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
