import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(64)
    .regex(/^[a-z0-9._-]+$/),
  roleId: z.string().min(1),
  temporaryPassword: z.string().min(12).max(128),
  status: z.enum(["PENDING_ACTIVATION", "ACTIVE", "LOCKED", "DISABLED"]),
  forcePasswordChange: z.preprocess(
    (value) => value === "on" || value === true,
    z.boolean(),
  ),
  copilotEnabled: z.preprocess(
    (value) => value === "on" || value === true,
    z.boolean(),
  ),
});

export const updateUserStatusSchema = z.object({
  userId: z.string().min(1),
  status: z.enum(["ACTIVE", "LOCKED", "DISABLED"]),
});

export const deleteUserSchema = z.object({
  userId: z.string().min(1),
  confirmationEmail: z.string().trim().toLowerCase().email(),
});

export const adminResetPasswordSchema = z.object({
  userId: z.string().min(1),
  temporaryPassword: z.string().min(12).max(128),
});

export const assignRoleSchema = z.object({
  userId: z.string().min(1),
  roleId: z.string().min(1),
});

export const updateUserSchema = z.object({
  userId: z.string().min(1),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(64)
    .regex(/^[a-z0-9._-]+$/),
  copilotEnabled: z.preprocess(
    (value) => value === "on" || value === true,
    z.boolean(),
  ),
});

export const grantResourceAccessSchema = z.object({
  userId: z.string().min(1),
  resourceType: z.enum(["datasource", "dashboard"]),
  resourceId: z.string().min(1),
  level: z.string().min(1),
  canExport: z.preprocess(
    (value) => value === "on" || value === true,
    z.boolean(),
  ),
});
