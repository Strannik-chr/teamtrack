import { db } from "../pkg/firebase/admin.js";

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: "ADMIN" | "MANAGER" | "MEMBER" | "VIEWER";
  createdAt: Date;
}

export class UserRepository {
  private collection = db.collection("users");

  async createOrUpdate(user: User): Promise<User> {
    await this.collection.doc(user.uid).set({
      ...user,
      createdAt: user.createdAt || new Date(),
    }, { merge: true });
    return user;
  }

  async findById(uid: string): Promise<User | null> {
    const doc = await this.collection.doc(uid).get();
    if (!doc.exists) return null;
    return doc.data() as User;
  }

  async listAll(): Promise<User[]> {
    const snapshot = await this.collection.get();
    return snapshot.docs.map(doc => doc.data() as User);
  }
}
