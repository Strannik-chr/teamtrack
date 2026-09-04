import { Router } from "express";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { config } from "../../config/config.js";
import { z } from "zod";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post("/register", async (req, res) => {
  try {
    const { email, password, fullName } = registerSchema.parse(req.body);

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return res.status(409).json({ error: "Email already in use" });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const [newUser] = await db.insert(users).values({
      email,
      passwordHash,
      fullName,
    }).returning();

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      config.jwtSecret,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      user: { id: newUser.id, email: newUser.email, fullName: newUser.fullName, role: newUser.role },
      token,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: (error as any).errors });
    }
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: "7d" }
    );

    res.json({
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
      token,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: (error as any).errors });
    }
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export const authRouter = router;
