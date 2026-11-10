import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  getServiceClient,
  getAnonClient,
  cleanupTestData,
} from "./support/supabase";
import { citizenSignUpAction } from "@/server/controllers/citizen-auth";
import { citizenSignUpSchema } from "@/lib/validation/citizen-auth";

describe("Citizen Registration and NIK Database Storage", () => {
  const serviceClient = getServiceClient();
  const anonClient = getAnonClient();

  const validNik = "1234567890123456";
  const duplicateNik = "3201012345678901";
  const testEmail = "warga.test@example.com";
  const testPassword = "PasswordWarga123!";

  beforeAll(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe("NIK Zod Validation", () => {
    it("rejects NIK with less than 16 digits", () => {
      const result = citizenSignUpSchema.safeParse({
        nik: "1234567890",
        email: "warga@example.com",
        password: "password123",
        passwordConfirm: "password123",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("16 digit");
      }
    });

    it("rejects NIK with non-numeric characters", () => {
      const result = citizenSignUpSchema.safeParse({
        nik: "123456789012345a",
        email: "warga@example.com",
        password: "password123",
        passwordConfirm: "password123",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("16 digit angka");
      }
    });

    it("rejects empty NIK", () => {
      const result = citizenSignUpSchema.safeParse({
        nik: "",
        email: "warga@example.com",
        password: "password123",
        passwordConfirm: "password123",
      });

      expect(result.success).toBe(false);
    });

    it("accepts valid 16-digit numeric NIK", () => {
      const result = citizenSignUpSchema.safeParse({
        nik: validNik,
        email: "warga@example.com",
        password: "password123",
        passwordConfirm: "password123",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("Citizen Sign-Up Action and Database Persistence", () => {
    it("returns validation error when NIK is missing from form data", async () => {
      const formData = new FormData();
      formData.append("email", "invalid.nik@example.com");
      formData.append("password", testPassword);
      formData.append("passwordConfirm", testPassword);

      const result = await citizenSignUpAction(formData);
      expect(result.success).toBe(false);
      expect(result.message).toContain("16 digit");
    });

    it("successfully registers citizen and persists NIK to database", async () => {
      const formData = new FormData();
      formData.append("nik", duplicateNik);
      formData.append("email", testEmail);
      formData.append("password", testPassword);
      formData.append("passwordConfirm", testPassword);

      const result = await citizenSignUpAction(formData);
      expect(result.success).toBe(true);

      // Verify NIK is stored in citizen_profiles in database
      const { data: citizenProfile } = await serviceClient
        .from("citizen_profiles")
        .select("*")
        .eq("nik", duplicateNik)
        .maybeSingle();

      expect(citizenProfile).not.toBeNull();
      expect(citizenProfile?.nik).toBe(duplicateNik);

      // Verify raw_user_meta_data contains nik
      const { data: usersList } = await serviceClient.auth.admin.listUsers();
      const createdUser = usersList?.users?.find((u) => u.email === testEmail);
      expect(createdUser?.user_metadata?.nik).toBe(duplicateNik);
    });

    it("rejects registration when NIK is already registered", async () => {
      const formData = new FormData();
      formData.append("nik", duplicateNik);
      formData.append("email", "another.email@example.com");
      formData.append("password", testPassword);
      formData.append("passwordConfirm", testPassword);

      const result = await citizenSignUpAction(formData);
      expect(result.success).toBe(false);
      expect(result.message?.toLowerCase()).toContain("terdaftar");
    });
  });

  describe("citizen_profiles RLS policies", () => {
    it("prevents anon from reading citizen_profiles", async () => {
      const { data } = await anonClient
        .from("citizen_profiles")
        .select("*")
        .eq("nik", duplicateNik);

      expect(data?.length).toBe(0);
    });
  });
});

