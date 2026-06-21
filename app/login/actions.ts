"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/get-locale";

export async function loginAction(
  _prevState: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/post-login",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      const { dict } = await getDictionary();
      return { error: dict.errors.invalidCredentials };
    }
    throw error;
  }
}
