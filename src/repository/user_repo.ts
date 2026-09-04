import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";

export class UserRepository {
  async findByEmail(email: string): Promise<any> {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email)
    });
    return user || null;
  }

  async findById(id: string): Promise<any> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, id)
    });
    return user || null;
  }

  async listAll(): Promise<any[]> {
    const allUsers = await db.query.users.findMany();
    return allUsers;
  }
}