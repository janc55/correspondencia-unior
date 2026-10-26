'use client';

import { KeyRound, Pencil, RefreshCw, ShieldAlert, UserPlus, Users } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';

import { ApiErrorAlert, InlineAlert } from '@/components/Alert';
import { Button, IconButton } from '@/components/Button';
import { Card } from '@/components/Card';
import { DataTable, type Column } from '@/components/DataTable';
import { EmptyState } from '@/components/EmptyState';
import { CheckField, Input, Select } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { PageHeader } from '@/components/PageHeader';
import { Pagination } from '@/components/Pagination';
import { RoleBadge } from '@/components/RoleBadge';
import { useToast } from '@/components/Toast';
import { api, ROLE_LIST } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { useDebouncedValue } from '@/lib/hooks';
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '@/lib/labels';
import type {
  CreateUserInput,
  Department,
  PaginationMeta,
  Role,
  UpdateUserInput,
  User,
} from '@/lib/types';

const EMPTY_META: PaginationMeta = { page: 1, pageSize: 20, total: 0, totalPages: 1 };

type ActiveFilter = 'all' | 'active' | 'inactive';

interface CreateForm {
  name: string;
  email: string;
  password: string;
  role: Role;
  departmentId: string;
}

const EMPTY_CREATE_FORM: CreateForm = {
  name: '',
  email: '',
  password: '',
  role: 'DESTINATARIO',
  departmentId: '',
};

interface EditForm {
  name: string;
  role: Role;
  departmentId: string;
  active: boolean;
}

export default function UsuariosPage() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === 'ADMIN';

  const [rows, setRows] = useState<User[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | ''>('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE_FORM);
  const [createError, setCreateError] = useState<unknown>(null);
  const [creating, setCreating] = useState(false);

  const [editing, setEditing] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    name: '',
    role: 'DESTINATARIO',
    departmentId: '',
    active: true,
  });
  const [editError, setEditError] = useState<unknown>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [resetting, setResetting] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState<unknown>(null);
  const [resettingBusy, setResettingBusy] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 400);
  const activeDepartments = departments.filter((department) => department.active);

  const load = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await api.users.list({
        page,
        pageSize,
        search: debouncedSearch.trim() || undefined,
        role: roleFilter || undefined,
        active: activeFilter === 'all' ? undefined : activeFilter === 'active',
      });
      setRows(response.data);
      setMeta(response.meta);
    } catch (caught) {
      setError(caught);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, page, pageSize, debouncedSearch, roleFilter, activeFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter, activeFilter, pageSize]);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    api.departments
      .list()
      .then((data) => {
        if (!cancelled) setDepartments(data);
      })
      .catch(() => {
        if (!cancelled) setDepartments([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const openCreate = () => {
    setCreateForm(EMPTY_CREATE_FORM);
    setCreateError(null);
    setCreateOpen(true);
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError(null);
    if (createForm.name.trim().length < 3) {
      setCreateError(new Error('El nombre debe tener al menos 3 caracteres.'));
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(createForm.email.trim())) {
      setCreateError(new Error('Ingrese un correo electrónico válido.'));
      return;
    }
    if (createForm.password.length < 8) {
      setCreateError(new Error('La contraseña debe tener al menos 8 caracteres.'));
      return;
    }
    setCreating(true);
    try {
      const payload: CreateUserInput = {
        name: createForm.name.trim(),
        email: createForm.email.trim().toLowerCase(),
        password: createForm.password,
        role: createForm.role,
        departmentId: createForm.departmentId || null,
      };
      await api.users.create(payload);
      toast.success('Usuario creado correctamente.');
      setCreateOpen(false);
      void load();
    } catch (caught) {
      setCreateError(caught);
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (target: User) => {
    setEditing(target);
    setEditForm({
      name: target.name,
      role: target.role,
      departmentId: target.department?.id ?? '',
      active: target.active,
    });
    setEditError(null);
  };

  const handleEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    setEditError(null);
    if (editForm.name.trim().length < 3) {
      setEditError(new Error('El nombre debe tener al menos 3 caracteres.'));
      return;
    }
    setSavingEdit(true);
    try {
      const payload: UpdateUserInput = {
        name: editForm.name.trim(),
        role: editForm.role,
        departmentId: editForm.departmentId || null,
        active: editForm.active,
      };
      await api.users.update(editing.id, payload);
      toast.success('Usuario actualizado.');
      setEditing(null);
      void load();
    } catch (caught) {
      setEditError(caught);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!resetting) return;
    setResetError(null);
    if (newPassword.length < 8) {
      setResetError(new Error('La nueva contraseña debe tener al menos 8 caracteres.'));
      return;
    }
    setResettingBusy(true);
    try {
      await api.users.resetPassword(resetting.id, newPassword);
      toast.success(`Contraseña restablecida para ${resetting.name}.`);
      setResetting(null);
      setNewPassword('');
    } catch (caught) {
      setResetError(caught);
    } finally {
      setResettingBusy(false);
    }
  };

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'Usuario',
      render: (row) => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800">{row.name}</p>
          <p className="truncate text-xs text-slate-500">{row.email}</p>
        </div>
      ),
    },
    { key: 'role', header: 'Rol', render: (row) => <RoleBadge role={row.role} /> },
    {
      key: 'department',
      header: 'Departamento',
      render: (row) =>
        row.department ? (
          <span className="text-sm text-slate-700">{row.department.name}</span>
        ) : (
          <span className="text-xs text-slate-400">Sin departamento</span>
        ),
    },
    {
      key: 'active',
      header: 'Estado',
      render: (row) => (
        <span
          className={
            row.active
              ? 'inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800'
              : 'inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600'
          }
        >
          <span
            className={
              row.active
                ? 'h-1.5 w-1.5 rounded-full bg-emerald-600'
                : 'h-1.5 w-1.5 rounded-full bg-slate-400'
            }
            aria-hidden="true"
          />
          {row.active ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      key: 'lastLoginAt',
      header: 'Último ingreso',
      render: (row) => (
        <span className="text-xs tabular text-slate-600">
          {row.lastLoginAt ? formatDateTime(row.lastLoginAt) : 'Nunca'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <IconButton
            label={`Editar ${row.name}`}
            icon={<Pencil className="h-4 w-4" aria-hidden="true" />}
            onClick={() => openEdit(row)}
            variant="secondary"
            size="sm"
          />
          <IconButton
            label={`Restablecer contraseña de ${row.name}`}
            icon={<KeyRound className="h-4 w-4" aria-hidden="true" />}
            onClick={() => {
              setResetting(row);
              setNewPassword('');
              setResetError(null);
            }}
            variant="secondary"
            size="sm"
          />
        </div>
      ),
    },
  ];

  if (!isAdmin) {
    return (
      <Card>
        <EmptyState
          icon={ShieldAlert}
          title="Acceso restringido"
          description="La administración de usuarios está disponible únicamente para el rol Administrador."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Administración"
        title="Usuarios"
        description="Alta, roles, departamento y estado de los usuarios internos. El restablecimiento de contraseña es inmediato."
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void load()}
              loading={loading}
              icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
            >
              Actualizar
            </Button>
            <Button
              size="sm"
              onClick={openCreate}
              icon={<UserPlus className="h-4 w-4" aria-hidden="true" />}
            >
              Nuevo usuario
            </Button>
          </>
        }
      />

      {error ? <ApiErrorAlert error={error} /> : null}

      <Card className="p-4">
        <div className="grid gap-3 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <Input
              label="Buscar"
              placeholder="Nombre o correo electrónico"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="lg:col-span-3">
            <Select
              label="Rol"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as Role | '')}
            >
              <option value="">Todos</option>
              {ROLE_LIST.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </Select>
          </div>
          <div className="lg:col-span-3">
            <Select
              label="Estado"
              value={activeFilter}
              onChange={(event) => setActiveFilter(event.target.value as ActiveFilter)}
            >
              <option value="all">Todos</option>
              <option value="active">Solo activos</option>
              <option value="inactive">Solo inactivos</option>
            </Select>
          </div>
        </div>
        <p className="mt-3 border-t border-line pt-3 text-xs text-slate-500">
          {meta.total} usuario{meta.total === 1 ? '' : 's'} · Los usuarios inactivos no pueden
          iniciar sesión.
        </p>
      </Card>

      <Card className="overflow-hidden">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          loading={loading}
          caption="Usuarios internos"
          skeletonRows={6}
          empty={
            <EmptyState
              icon={Users}
              title="Sin usuarios que coincidan"
              description="Ajuste la búsqueda o cree un nuevo usuario interno."
              action={
                <Button size="sm" onClick={openCreate}>
                  Nuevo usuario
                </Button>
              }
            />
          }
        />
        <Pagination
          page={meta.page}
          totalPages={meta.totalPages}
          total={meta.total}
          pageSize={meta.pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 20, 50, 100]}
          disabled={loading}
        />
      </Card>

      <InlineAlert tone="info" title="Roles y alcance">
        <ul className="mt-1 space-y-0.5">
          {ROLE_LIST.map((role) => (
            <li key={role}>
              <span className="font-medium">{ROLE_LABELS[role]}:</span> {ROLE_DESCRIPTIONS[role]}
            </li>
          ))}
        </ul>
      </InlineAlert>

      {/* Alta de usuario */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nuevo usuario"
        description="El usuario podrá iniciar sesión con la contraseña definida aquí."
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancelar
            </Button>
            <Button type="submit" form="create-user-form" loading={creating}>
              Crear usuario
            </Button>
          </>
        }
      >
        <form id="create-user-form" className="space-y-3" onSubmit={handleCreate} noValidate>
          <Input
            label="Nombre completo"
            value={createForm.name}
            onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })}
            required
            maxLength={120}
            autoComplete="off"
          />
          <Input
            label="Correo institucional"
            type="email"
            value={createForm.email}
            onChange={(event) => setCreateForm({ ...createForm, email: event.target.value })}
            required
            placeholder="usuario@unior.edu.bo"
            autoComplete="off"
          />
          <Input
            label="Contraseña inicial"
            type="password"
            value={createForm.password}
            onChange={(event) => setCreateForm({ ...createForm, password: event.target.value })}
            required
            hint="Mínimo 8 caracteres. Compártala por un canal seguro."
            autoComplete="new-password"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Rol"
              value={createForm.role}
              onChange={(event) =>
                setCreateForm({ ...createForm, role: event.target.value as Role })
              }
              required
            >
              {ROLE_LIST.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </Select>
            <Select
              label="Departamento"
              value={createForm.departmentId}
              onChange={(event) =>
                setCreateForm({ ...createForm, departmentId: event.target.value })
              }
            >
              <option value="">Sin departamento</option>
              {activeDepartments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </Select>
          </div>
          {createError ? <ApiErrorAlert error={createError} /> : null}
        </form>
      </Modal>

      {/* Edición de usuario */}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Editar usuario"
        description={editing ? editing.email : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)} disabled={savingEdit}>
              Cancelar
            </Button>
            <Button type="submit" form="edit-user-form" loading={savingEdit}>
              Guardar cambios
            </Button>
          </>
        }
      >
        <form id="edit-user-form" className="space-y-3" onSubmit={handleEdit} noValidate>
          <Input
            label="Nombre completo"
            value={editForm.name}
            onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
            required
            maxLength={120}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Rol"
              value={editForm.role}
              onChange={(event) => setEditForm({ ...editForm, role: event.target.value as Role })}
              required
            >
              {ROLE_LIST.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </Select>
            <Select
              label="Departamento"
              value={editForm.departmentId}
              onChange={(event) => setEditForm({ ...editForm, departmentId: event.target.value })}
            >
              <option value="">Sin departamento</option>
              {activeDepartments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </Select>
          </div>
          <CheckField
            label="Usuario activo"
            description="Si se desactiva, el usuario no podrá iniciar sesión."
            checked={editForm.active}
            onChange={(checked) => setEditForm({ ...editForm, active: checked })}
          />
          {editError ? <ApiErrorAlert error={editError} /> : null}
        </form>
      </Modal>

      {/* Restablecer contraseña */}
      <Modal
        open={resetting !== null}
        onClose={() => setResetting(null)}
        title="Restablecer contraseña"
        description={resetting ? `${resetting.name} · ${resetting.email}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetting(null)} disabled={resettingBusy}>
              Cancelar
            </Button>
            <Button type="submit" form="reset-password-form" loading={resettingBusy}>
              Restablecer
            </Button>
          </>
        }
      >
        <form
          id="reset-password-form"
          className="space-y-3"
          onSubmit={handleResetPassword}
          noValidate
        >
          <Input
            label="Nueva contraseña"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            hint="Mínimo 8 caracteres. La contraseña anterior dejará de funcionar."
            autoComplete="new-password"
          />
          {resetError ? <ApiErrorAlert error={resetError} /> : null}
        </form>
      </Modal>

      <p className="text-xs text-slate-500">
        Las operaciones quedan registradas en auditoría con el actor que las ejecuta.
      </p>
    </div>
  );
}
