"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Old address. Password resets now start from the sign-in page: type your email there and
 * tap "Forgot password?". The link only ever goes to that account's own email.
 */
export default function ForgotPasswordPage() {
  const router = useRouter();
  useEffect(() => router.replace("/login"), [router]);
  return null;
}
