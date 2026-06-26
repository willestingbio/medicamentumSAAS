'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  listOrgInvitations,
  createInvitation,
  deleteInvitation,
  getOrgInfo,
  listOrgMembers,
} from '@/lib/actions/invitation';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Copy, Trash2, Users, CheckCircle2, Clock, AlertCircle, Building2 } from 'lucide-react';

interface Invitation {
  id: string;
  email: string;
  role: string;
  orgCode: string;
  accepted: boolean;
  expiresAt: Date;
  createdAt: Date;
}

interface OrgMember {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}

interface OrganizationInfo {
  id: string;
  name: string;
  orgCode: string;
}

function InvitationRow({ invitation, onDelete }: { invitation: Invitation; onDelete: (id: string) => void }) {
  const isExpired = new Date(invitation.expiresAt) < new Date();

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center gap-3">
        {invitation.accepted ? (
          <CheckCircle2 className="size-5 text-green-500" />
        ) : isExpired ? (
          <AlertCircle className="size-5 text-muted-foreground" />
        ) : (
          <Clock className="size-5 text-primary" />
        )}
        <div>
          <p className="text-sm font-medium">{invitation.email}</p>
          <p className="text-xs text-muted-foreground">
            {invitation.accepted
              ? 'Aceptada'
              : isExpired
              ? 'Expirada'
              : `Expira ${new Date(invitation.expiresAt).toLocaleDateString('es-CO')}`}
          </p>
        </div>
      </div>
      {!invitation.accepted && !isExpired && (
        <Button variant="ghost" size="sm" onClick={() => onDelete(invitation.id)}>
          <Trash2 className="size-4" />
        </Button>
      )}
    </div>
  );
}

function MemberRow({ member }: { member: OrgMember }) {
  const roleLabel = member.role === 'hospital_admin' ? 'Administrador' : member.role === 'super_admin' ? 'Super Admin' : 'Estudiante';

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center gap-3">
        <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-sm font-medium text-primary">
            {member.name?.charAt(0).toUpperCase() ?? 'U'}
          </span>
        </div>
        <div>
          <p className="text-sm font-medium">{member.name}</p>
          <p className="text-xs text-muted-foreground">{member.email}</p>
        </div>
      </div>
      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">{roleLabel}</span>
    </div>
  );
}

export default function OrgEmployeesPage() {
  const router = useRouter();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgInfo, setOrgInfo] = useState<OrganizationInfo | null>(null);
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    authClient.getSession().then((s) => {
      const sessionData = s as any;
      if (!sessionData?.user) {
        router.push('/sign-in?redirect_to=/org/employees');
        return;
      }
      const role = sessionData.user.role;
      if (role !== 'hospital_admin' && role !== 'super_admin') {
        router.push('/dashboard');
        return;
      }
      loadData();
    });
  }, [router]);

  async function loadData() {
    try {
      const [org, invs, mems] = await Promise.all([
        getOrgInfo(),
        listOrgInvitations(),
        listOrgMembers(),
      ]);
      setOrgInfo(org);
      setInvitations(invs as Invitation[]);
      setMembers(mems as OrgMember[]);
    } catch (e: any) {
      setError(e.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setInviting(true);
    setInviteError(null);

    try {
      await createInvitation(email);
      const invs = await listOrgInvitations();
      setInvitations(invs as Invitation[]);
      setEmail('');
    } catch (e: any) {
      setInviteError(e.message || 'Error al enviar invitación');
    } finally {
      setInviting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteInvitation(id);
      setInvitations((prev) => prev.filter((i) => i.id !== id));
    } catch (e: any) {
      setError(e.message || 'Error al eliminar');
    }
  }

  async function copyOrgCode() {
    if (orgInfo?.orgCode) {
      await navigator.clipboard.writeText(orgInfo.orgCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Gestión de empleados</h1>
        <p className="text-muted-foreground mt-1">
          Invita empleados a tu organización
        </p>
      </div>

      {orgInfo && (
        <div className="rounded-lg border p-4">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Código de invitación</h2>
          <div className="flex items-center gap-3">
            <code className="flex-1 rounded bg-muted px-3 py-2 font-mono text-lg">
              {orgInfo.orgCode}
            </code>
            <Button variant="outline" size="sm" onClick={copyOrgCode}>
              <Copy className="size-4 mr-2" />
              {copySuccess ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Comparte este código con tus empleados. Ellos deben usarlo al registrarse en{' '}
            <code className="bg-muted px-1 rounded">/sign-up?org_code={orgInfo.orgCode}</code>
          </p>
        </div>
      )}

      <div className="rounded-lg border p-4">
        <h2 className="text-sm font-medium mb-4">Invitar empleado</h2>
        <form onSubmit={handleInvite} className="flex gap-3">
          <div className="flex-1">
            <Input
              type="email"
              placeholder="correo@hospital.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={inviting}>
            <Plus className="size-4 mr-2" />
            {inviting ? 'Enviando...' : 'Invitar'}
          </Button>
        </form>
        {inviteError && (
          <p className="text-sm text-destructive mt-2">{inviteError}</p>
        )}
      </div>

      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">
          Empleados ({members.length})
        </h2>
        {members.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="size-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay empleados registrados</p>
          </div>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <MemberRow key={member.id} member={member} />
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">
          Invitaciones ({invitations.length})
        </h2>
        {invitations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="size-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay invitaciones</p>
          </div>
        ) : (
          <div className="space-y-2">
            {invitations.map((inv) => (
              <InvitationRow key={inv.id} invitation={inv} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}