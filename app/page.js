import { redirect } from "next/navigation";
import { cookies } from "next/headers";
const { verifyToken, COOKIE_NAME } = require("../lib/auth");

export default function Home() {
  const token = cookies().get(COOKIE_NAME)?.value;
  const user = token ? verifyToken(token) : null;

  if (!user) redirect("/login");
  if (user.role === "agent" || user.role === "admin") redirect("/agent/dashboard");
  redirect("/customer/dashboard");
}
