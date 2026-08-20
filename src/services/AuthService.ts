import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

export type OAuthProvider = 'google' | 'apple' | 'facebook';

/** profiles.login_type 값 정의 (DB smallint와 동일) */
export const LoginType = {
  GUEST:    0,
  GOOGLE:   1,
  APPLE:    2,
  FACEBOOK: 3,
} as const;
export type LoginType = (typeof LoginType)[keyof typeof LoginType];

export class AuthService {
  async signInAsGuest(): Promise<void> {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
  }

  async signInWithOAuth(provider: OAuthProvider): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) throw error;
  }

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async getSession(): Promise<Session | null> {
    const { data } = await supabase.auth.getSession();
    return data.session;
  }

  async getUser(): Promise<User | null> {
    const { data } = await supabase.auth.getUser();
    return data.user;
  }

  onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ?? null);
    });
  }
}

export const authService = new AuthService();
