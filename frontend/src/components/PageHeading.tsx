import type { ReactNode } from 'react'
type PageHeadingProps = { eyebrow: string; title: string; children: ReactNode }
export function PageHeading({ eyebrow, title, children }: PageHeadingProps) { return <section className="page-heading"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{children}</p></section> }
