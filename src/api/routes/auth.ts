import { Router } from "express";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { config } from "../../config/config.js";
import { z } from "zod";
import crypto from "crypto";

const router = Router();

// Simple in-memory refresh token store for now
// In a full production app, this should be in Redis or PostgreSQL
const refreshTokens = new Map<string, { userId: string; expiresAt: Date }>();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const generateTokens = (user: { id: string; email: string; role: string }) => {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: "15m" }
  );

  const refreshToken = crypto.randomBytes(40).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  refreshTokens.set(refreshToken, { userId: user.id, expiresAt });

  return { accessToken, refreshToken };
};

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

    const tokens = generateTokens(newUser);

    res.status(201).json({
      user: { id: newUser.id, email: newUser.email, fullName: newUser.fullName, role: newUser.role },
      ...tokens,
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

    const tokens = generateTokens(user);

    res.json({
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
      ...tokens,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: (error as any).errors });
    }
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/refresh", async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: "Refresh token is required" });
    }

    const tokenData = refreshTokens.get(token);
    
    if (!tokenData) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    if (tokenData.expiresAt < new Date()) {
      refreshTokens.delete(token);
      return res.status(401).json({ error: "Refresh token expired" });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, tokenData.userId),
    });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Rotate token
    refreshTokens.delete(token);
    const newTokens = generateTokens(user);

    res.json(newTokens);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/logout", (req, res) => {
  const { token } = req.body;
  if (token) {
    refreshTokens.delete(token);
  }
  res.json({ success: true });
});

router.post("/logout-all", async (req, res) => {
  const { userId } = req.body; 
  if (userId) {
     for (const [token, data] of refreshTokens.entries()) {
        if (data.userId === userId) {
            refreshTokens.delete(token);
        }
     }
  }
  res.json({ success: true });
});

export const authRouter = router;
