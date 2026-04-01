import { Plugin, type PluginModel } from "@leproj/tennet";
import type { StorageItem } from "@leproj/tennet";

/** Basic email format regex. */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Allowed user statuses. */
export type UserStatus = "active" | "inactive";

const VALID_STATUSES: UserStatus[] = ["active", "inactive"];

export class UsersPlugin extends Plugin {
  name: string;
  description: string;
  model: PluginModel;

  constructor() {
    super();
    this.name = "UserPlugin";
    this.description = "Manage users and permissions.";
    this.model = {
      email: "string",
      display_name: "string",
      role_id: "string",
      status: "string",
    };
  }

  /**
   * Synchronous validation for UsersPlugin data.
   * Checks email format, display_name required, role_id required, status enum.
   */
  public override validate(
    data: Record<string, unknown>,
  ): { valid: boolean; errors: Record<string, string> } {
    // Default status to "active" if not provided
    if (
      data.status === undefined || data.status === null || data.status === ""
    ) {
      data.status = "active";
    }

    const { errors } = super.validate(data);

    // email: required + format
    const email = data.email;
    if (typeof email === "string" && email !== "") {
      if (!EMAIL_REGEX.test(email)) {
        errors.email = "email must be a valid email address";
      }
    }

    // status: must be active or inactive
    const status = data.status;
    if (typeof status === "string" && status !== "") {
      if (!VALID_STATUSES.includes(status as UserStatus)) {
        errors.status = "status must be active or inactive";
      }
    }

    return { valid: Object.keys(errors).length === 0, errors };
  }

  /**
   * Async validation that checks email uniqueness and role_id existence.
   *
   * @param data - The user data to validate
   * @param excludeId - Item ID to exclude from uniqueness check (for updates)
   */
  public async validateAsync(
    data: Record<string, unknown>,
    excludeId?: string,
  ): Promise<{ valid: boolean; errors: Record<string, string> }> {
    const { valid, errors } = this.validate(data);
    if (!valid) return { valid, errors };

    // Email uniqueness check
    const email = data.email as string;
    if (email && "listByIndex" in this.storage) {
      const storage = this.storage as {
        listByIndex(
          field: string,
          value: string,
        ): Promise<StorageItem[]>;
      };
      const existing = await storage.listByIndex("email", email);
      const conflict = existing.find((item: StorageItem) =>
        item.id !== excludeId
      );
      if (conflict) {
        errors.email = `email "${email}" is already in use`;
        return { valid: false, errors };
      }
    }

    return { valid: Object.keys(errors).length === 0, errors };
  }
}
