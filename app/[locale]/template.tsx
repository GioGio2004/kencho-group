/*
 * Re-mounted on every navigation (unlike the layout), so each page
 * rises in through the same short transition (globals.css, .page-enter).
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
