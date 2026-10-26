import { Department, Role, User } from '@prisma/client';

export type UserWithDepartment = User & {
  department: Pick<Department, 'id' | 'name' | 'code'> | null;
};

export type UserDto = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  department: { id: string; name: string; code: string } | null;
  departmentId: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
};

/** Proyección pública de usuario: nunca incluye el hash de la contraseña. */
export function toUserDto(user: UserWithDepartment | User): UserDto {
  const department =
    'department' in user && user.department
      ? { id: user.department.id, name: user.department.name, code: user.department.code }
      : null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    department,
    departmentId: user.departmentId,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}
