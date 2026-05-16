import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function getSession() {
  const session = await getServerSession(authOptions)
  return session
}

// These are no longer needed as NextAuth handles cookies
export async function createSession() {}
export async function updateSession() {}
export async function deleteSession() {}
