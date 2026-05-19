"use server";

import { checkoutDraftSchema, loginSchema, profileSchema, registerSchema, flattenZodErrors } from "@/lib/validation";

function parseWithSchema(schema, rawData) {
  const result = schema.safeParse(rawData);
  if (!result.success) {
    return { ok: false, errors: flattenZodErrors(result) };
  }
  return { ok: true, data: result.data, errors: {} };
}

export async function validateLoginAction(_prevState, formData) {
  return parseWithSchema(loginSchema, {
    email: formData.get("email"),
    password: formData.get("password")
  });
}

export async function validateRegisterAction(_prevState, formData) {
  return parseWithSchema(registerSchema, {
    username: formData.get("username"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword")
  });
}

export async function validateProfileAction(_prevState, formData) {
  return parseWithSchema(profileSchema, {
    username: formData.get("username"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    birthDate: formData.get("birthDate"),
    newPassword: formData.get("newPassword")
  });
}

export async function validateCheckoutDraftAction(_prevState, payload) {
  return parseWithSchema(checkoutDraftSchema, payload);
}
