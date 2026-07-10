/**
 * Tipos extendidos de sesión para Medicamentum360.
 *
 * Extiende los tipos base de Better Auth con los additionalFields
 * definidos en auth.ts. Usado en todo el proyecto para eliminar
 * los casts `as any` sobre session.user.
 */
export interface AppUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  emailVerified: boolean;
  role: 'super_admin' | 'hospital_admin' | 'student';
  organizationId: string | null;
  moodleUserId: number | null;
  specialty: string | null;
  locale: string;
  theme: string;
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
  vendorStatus?: 'pending_kyc' | 'pending_review' | 'active' | 'suspended' | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppSession {
  user: AppUser;
  session: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    expiresAt: Date;
    token: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    userId: string;
  };
}
