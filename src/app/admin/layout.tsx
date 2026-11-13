import type { Metadata } from "next";

// Admin pages are private: never indexed, whatever the site-wide setting.
export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | RecruiterLink admin" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
