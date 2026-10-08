import { jsonOk, publicRoute, readJsonBody } from "@/server/http";
import { loginSchema } from "@/server/validators/auth";
import { login } from "@/server/services/auth.service";
import { setSessionCookie } from "@/server/auth/cookies";

/**
 * POST /api/auth/login
 * Body: { email, password }
 *
 * Returns the JWT in the body (so Postman/curl clients can use
 * `Authorization: Bearer <token>`) and also sets it as an httpOnly cookie for
 * the browser session, keeping the token out of reach of client-side scripts.
 */
export const POST = publicRoute(async ({ request }) => {
  const input = loginSchema.parse(await readJsonBody(request));
  const { token, user } = await login(input);

  const response = jsonOk({ token, user });
  setSessionCookie(response, token);
  return response;
});
