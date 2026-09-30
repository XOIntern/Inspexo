import Image from "next/image";

const columns = [
  {
    heading: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "How it works", href: "#how-it-works" },
      { label: "Mobile inspections", href: "#features" },
      { label: "Integrations", href: "#features" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "Why InspeXO", href: "#benefits" },
      { label: "FAQ", href: "#faq" },
      { label: "Book a demo", href: "mailto:hello@inspexo.com?subject=Demo%20request" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Sign in", href: "/auth/login" },
      { label: "Inspection templates", href: "#how-it-works" },
      { label: "Contact", href: "mailto:hello@inspexo.com?subject=Question" },
    ],
  },
];

const social = [
  { label: "LinkedIn", href: "https://www.linkedin.com" },
  { label: "X", href: "https://x.com" },
];

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container border-t border-primary-foreground/15 py-marketing">
        <div className="grid gap-10 lg:grid-cols-12">
          {/* Brand block */}
          <div className="lg:col-span-4">
            <Image
              src="/logoXO.webp"
              alt="InspeXO logo"
              width={88}
              height={47}
              className="h-auto w-16"
            />
            <p className="mt-3 max-w-xs text-sm leading-6 opacity-80">
              The HSE system of record for inspections, findings, and
              corrective actions.
            </p>
            <ul className="mt-6 flex gap-2">
              {social.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center rounded-full border border-primary-foreground/25 px-3.5 text-xs font-semibold transition hover:bg-primary-foreground/10"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Link columns */}
          {columns.map((column) => (
            <nav
              key={column.heading}
              aria-label={column.heading}
              className="lg:col-span-2"
            >
              <h3 className="text-sm font-semibold">{column.heading}</h3>
              <ul className="mt-4 space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm opacity-80 transition hover:opacity-100 hover:underline"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-primary-foreground/15 pt-6 text-xs opacity-80 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} InspeXO. All rights reserved.</p>
          <p>HSE management for teams that have to pass the audit.</p>
        </div>
      </div>
    </footer>
  );
}
