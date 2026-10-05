import 'server-only'

import { createHash, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { isPasswordHash, verifyPassword } from '@/lib/security/password'
import { HttpError } from './http'

export const SESSION_TTL = 12 * 60 * 60
export const SESSION_COOKIE = 'taleteacup_session'
interface OwnerSession { ownerId: string; expiresAt: number }

export function getAuthConfig() {
  const name = process.env.LIBRARY_OWNER_NAME
  const passwordHash = process.env.LIBRARY_OWNER_PASSWORD_HASH
  const secret = process.env.LIBRARY_SESSION_SECRET
  if (!name || !/^[a-zA-Z0-9_.-]{3,64}$/.test(name) ||
      !passwordHash || !isPasswordHash(passwordHash) || !secret || secret.length < 32) {
    throw new HttpError(503, 'Owner sign-in is not configured. Run pnpm auth:setup on the server.')
  }
  // Rotating either credentials or the session key revokes previously issued sessions.
  const ownerId = createHash('sha256').update(`${name}:${passwordHash}`).digest('hex')
  return { name, passwordHash, secret, ownerId }
}

export async function getOwnerSession() {
  const config = getAuthConfig()
  return getIronSession<OwnerSession>(await cookies(), {
    cookieName: SESSION_COOKIE,
    password: config.secret,
    ttl: SESSION_TTL,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: SESSION_TTL
    }
  })
}

export async function getOwner(): Promise<{ id: string; name: string } | null> {
  const config = getAuthConfig()
  const session = await getOwnerSession()
  if (session.ownerId !== config.ownerId || typeof session.expiresAt !== 'number' || !Number.isFinite(session.expiresAt) ||
      session.expiresAt <= Date.now()) return null
  return { id: config.ownerId, name: config.name }
}

export async function requireOwner(): Promise<{ id: string; name: string }> {
  const owner = await getOwner()
  if (!owner) throw new HttpError(401, 'Sign in to access your library.')
  return owner
}

export async function verifyOwnerCredentials(name: string, password: string): Promise<boolean> {
  const config = getAuthConfig()
  // Always perform password derivation, including when the submitted name is wrong.
  const validPassword = await verifyPassword(password, config.passwordHash)
  const actualName = createHash('sha256').update(name).digest()
  const expectedName = createHash('sha256').update(config.name).digest()
  return timingSafeEqual(actualName, expectedName) && validPassword
}
