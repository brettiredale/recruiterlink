import { siteDescription, siteName } from "@/lib/site";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-zinc-500">
        In development
      </p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
        {siteName}
      </h1>
      <p className="mt-4 max-w-md text-lg text-zinc-600">
        {siteDescription}
      </p>
    </main>
  );
}
