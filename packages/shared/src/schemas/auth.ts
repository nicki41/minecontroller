import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(32, "Username must be at most 32 characters")
  .regex(/^[a-zA-Z0-9_-]+$/, "Only letters, numbers, underscores and hyphens allowed");

export const emailSchema = z.string().trim().toLowerCase().email("Invalid email address");

export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(256, "Password is too long")
  .refine((v) => /[a-z]/.test(v) && /[A-Z]/.test(v) && /[0-9]/.test(v), {
    message: "Password must contain an uppercase letter, a lowercase letter and a number",
  });

export const setupAdminSchema = z
  .object({
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type SetupAdminInput = z.infer<typeof setupAdminSchema>;

export const loginSchema = z.object({
  usernameOrEmail: z.string().trim().min(1, "Required"),
  password: z.string().min(1, "Required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Accepts either a 6-digit TOTP code or an XXXXX-XXXXX recovery code. */
export const verifyTotpLoginSchema = z.object({
  code: z.string().trim().min(1, "Required").max(32, "Invalid code"),
});
export type VerifyTotpLoginInput = z.infer<typeof verifyTotpLoginSchema>;

export const enableTotpSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app"),
});
export type EnableTotpInput = z.infer<typeof enableTotpSchema>;

export const disableTotpSchema = z.object({
  password: z.string().min(1, "Required"),
});
export type DisableTotpInput = z.infer<typeof disableTotpSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Required"),
    newPassword: passwordSchema,
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const createUserSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  roleIds: z.array(z.string()).default([]),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  email: emailSchema.optional(),
  isDisabled: z.boolean().optional(),
  roleIds: z.array(z.string()).optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
