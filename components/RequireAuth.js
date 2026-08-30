"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "./LoadingSpinner";

// Wrap any protected page in this. Fetches the current user from the
// server (via the httpOnly cookie) and redirects if not allowed.
export default function RequireAuth({ allowRoles, children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (!data.user) {
          router.replace("/login");
          return;
        }
        if (allowRoles && !allowRoles.includes(data.user.role)) {
          router.replace(data.user.role === "customer" ? "/customer/dashboard" : "/agent/dashboard");
          return;
        }
        setUser(data.user);
        setChecked(true);
      })
      .catch(() => router.replace("/login"));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!checked) return <LoadingSpinner label="Checking your session…" />;
  return children(user);
}
