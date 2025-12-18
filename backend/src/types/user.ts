export interface User {
  id: number;
  name: string;
  email: string;
  pwd_hash: string;
}

export interface UserPublic {
  id: number;
  name: string;
  email: string;
}

/**
 * Converts a User to a UserPublic (removes sensitive data)
 */
export function toUserPublic(user: User): UserPublic {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}
