import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OTP_TTL_MS = 5 * 60 * 1000;
const EMAIL_TIMEOUT_MS = 15 * 1000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const maskEmail = (email: string) => {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "invalid-email";
  return `${local.slice(0, 2)}***@${domain}`;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();

  try {
    const { email, otp, action } = await req.json();
    const normalizedEmail = typeof email === "string" ? normalizeEmail(email) : "";

    if (!normalizedEmail || normalizedEmail.length > 255 || !normalizedEmail.includes("@")) {
      return jsonResponse({ success: false, code: "INVALID_EMAIL", error: "Invalid email address." }, 400);
    }

    if (!action || !["send", "verify"].includes(action)) {
      return jsonResponse({ success: false, code: "INVALID_ACTION", error: "Invalid action." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? "Aapno Rasto <onboarding@resend.dev>";

    console.log("[verify-otp] Request received", {
      requestId,
      action,
      email: maskEmail(normalizedEmail),
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceRoleKey: !!supabaseServiceKey,
      hasResendApiKey: !!resendApiKey,
      hasCustomFromEmail: !!Deno.env.get("RESEND_FROM_EMAIL"),
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[verify-otp] Missing backend credentials", { requestId });
      return jsonResponse(
        {
          success: false,
          code: "SERVER_CONFIG_ERROR",
          error: "Server configuration error. Missing backend credentials.",
        },
        500,
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "send") {
      if (!resendApiKey) {
        console.error("[verify-otp] Missing RESEND_API_KEY", { requestId });
        return jsonResponse(
          {
            success: false,
            code: "EMAIL_PROVIDER_NOT_CONFIGURED",
            error: "Email service is not configured. Please contact administrator.",
          },
          500,
        );
      }

      // Server-side rate limiting: check if an OTP was sent recently
      const { data: existingOtp } = await supabase
        .from("otp_codes")
        .select("created_at")
        .eq("email", normalizedEmail)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingOtp?.created_at) {
        const secondsAgo = (Date.now() - new Date(existingOtp.created_at).getTime()) / 1000;
        if (secondsAgo < 60) {
          console.warn("[verify-otp] Rate limited", { requestId, email: maskEmail(normalizedEmail), secondsAgo });
          return jsonResponse(
            {
              success: false,
              code: "RATE_LIMITED",
              error: "Please wait before requesting another OTP.",
            },
            429,
          );
        }
      }

      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

      console.log("[verify-otp] OTP generated", {
        requestId,
        email: maskEmail(normalizedEmail),
        otpPreview: `${otpCode.slice(0, 2)}****`,
        expiresAt,
      });

      await supabase.from("otp_codes").delete().eq("email", normalizedEmail);

      const { error: insertError } = await supabase.from("otp_codes").insert({
        email: normalizedEmail,
        otp_code: otpCode,
        expires_at: expiresAt,
        verified: false,
      });

      if (insertError) {
        console.error("[verify-otp] Failed to store OTP", { requestId, error: insertError.message });
        return jsonResponse(
          {
            success: false,
            code: "OTP_STORE_FAILED",
            error: "Failed to store OTP. Please try again.",
          },
          500,
        );
      }

      console.log("[verify-otp] Email send attempt", {
        requestId,
        email: maskEmail(normalizedEmail),
        fromEmail,
      });

      const emailController = new AbortController();
      const emailTimeout = setTimeout(() => emailController.abort(), EMAIL_TIMEOUT_MS);

      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [normalizedEmail],
            subject: `Your OTP Code: ${otpCode} - Aapno Rasto`,
            html: `
              <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #002147 0%, #1a3a5c 100%); padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
                  <h2 style="color: white; margin: 0;">🏛️ Aapno Rasto</h2>
                  <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0 0; font-size: 13px;">Gujarat Civic Services</p>
                </div>
                <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; text-align: center;">
                  <p style="color: #333; margin-bottom: 20px;">Your verification code is:</p>
                  <div style="background: #f5f5f5; display: inline-block; padding: 16px 40px; border-radius: 8px; letter-spacing: 8px; font-size: 32px; font-weight: bold; color: #002147;">
                    ${otpCode}
                  </div>
                  <p style="color: #888; font-size: 13px; margin-top: 20px;">This code expires in 5 minutes. Do not share it with anyone.</p>
                </div>
                <div style="background: #f8f9fa; padding: 12px; border-radius: 0 0 12px 12px; text-align: center; border: 1px solid #e0e0e0; border-top: none;">
                  <p style="margin: 0; color: #999; font-size: 11px;">Gujarat Government Civic Services</p>
                </div>
              </div>
            `,
          }),
          signal: emailController.signal,
        });

        let emailResponseBody = "";
        try {
          emailResponseBody = await emailRes.text();
        } catch {
          emailResponseBody = "";
        }

        if (!emailRes.ok) {
          console.error("[verify-otp] Email send failed", {
            requestId,
            status: emailRes.status,
            response: emailResponseBody,
          });

          let resendMessage = "Failed to send email. Please check your email configuration.";
          try {
            const parsed = JSON.parse(emailResponseBody);
            resendMessage = parsed?.message || parsed?.error?.message || resendMessage;
          } catch {
            if (emailResponseBody) resendMessage = emailResponseBody;
          }

          const isSandboxRestriction = resendMessage.includes(
            "only send testing emails to your own email address",
          );

          const userMessage = isSandboxRestriction
            ? "Email provider is in sandbox mode. Use the verified test inbox or verify your sending domain to send OTPs to all users."
            : resendMessage;

          return jsonResponse(
            {
              success: false,
              code: "EMAIL_SEND_FAILED",
              error: userMessage,
            },
            emailRes.status >= 400 && emailRes.status < 500 ? 400 : 502,
          );
        }

        console.log("[verify-otp] Email sent successfully", {
          requestId,
          email: maskEmail(normalizedEmail),
          providerResponse: emailResponseBody,
        });
      } catch (emailError: unknown) {
        const emailMessage = emailError instanceof Error ? emailError.message : "Unknown email error";
        const isTimeout = emailError instanceof Error && emailError.name === "AbortError";

        console.error("[verify-otp] Email request exception", {
          requestId,
          isTimeout,
          error: emailMessage,
        });

        return jsonResponse(
          {
            success: false,
            code: isTimeout ? "EMAIL_TIMEOUT" : "EMAIL_REQUEST_FAILED",
            error: isTimeout
              ? "Email provider timed out. Please try resending OTP."
              : "Email request failed. Please try again.",
          },
          502,
        );
      } finally {
        clearTimeout(emailTimeout);
      }

      return jsonResponse(
        {
          success: true,
          message: "OTP sent",
          expiresInSeconds: OTP_TTL_MS / 1000,
        },
        200,
      );
    }

    if (!otp || typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
      return jsonResponse({ success: false, code: "INVALID_OTP_FORMAT", error: "Invalid OTP format." }, 400);
    }

    console.log("[verify-otp] OTP verify attempt", {
      requestId,
      email: maskEmail(normalizedEmail),
    });

    const { data: otpRecord, error: selectError } = await supabase
      .from("otp_codes")
      .select("id, email, expires_at, verified")
      .eq("email", normalizedEmail)
      .eq("otp_code", otp)
      .eq("verified", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (selectError || !otpRecord) {
      console.warn("[verify-otp] OTP invalid or expired", {
        requestId,
        email: maskEmail(normalizedEmail),
        selectError: selectError?.message,
      });
      return jsonResponse({ success: false, code: "OTP_INVALID_OR_EXPIRED", error: "Invalid or expired OTP." }, 400);
    }

    const { data: updatedRow, error: updateError } = await supabase
      .from("otp_codes")
      .update({ verified: true })
      .eq("id", otpRecord.id)
      .eq("verified", false)
      .select("id")
      .maybeSingle();

    if (updateError || !updatedRow) {
      console.warn("[verify-otp] OTP already used or update failed", {
        requestId,
        email: maskEmail(normalizedEmail),
        updateError: updateError?.message,
      });
      return jsonResponse({ success: false, code: "OTP_ALREADY_USED", error: "OTP already used. Please request a new code." }, 400);
    }

    await supabase.from("otp_codes").delete().eq("email", normalizedEmail);

    console.log("[verify-otp] OTP verified successfully", {
      requestId,
      email: maskEmail(normalizedEmail),
    });

    return jsonResponse({ success: true, message: "OTP verified" }, 200);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[verify-otp] Fatal error", { requestId, error: msg });
    return jsonResponse({ success: false, code: "REQUEST_PROCESSING_FAILED", error: msg }, 400);
  }
});
