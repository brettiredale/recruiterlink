import type { Metadata } from "next";

// Account pages are private: never indexed, whatever the site-wide setting.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: LayoutProps<"/account">) {
  return children;
}
