import { Container } from "@/components";

/** Shown for the moment it takes to check who is signed in. */
export default function AccountLoading() {
  return (
    <Container width="narrow" className="py-16 sm:py-24">
      <p role="status" className="text-lg text-muted">
        Loading your account…
      </p>
    </Container>
  );
}
