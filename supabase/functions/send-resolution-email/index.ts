import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ResolutionEmailRequest {
  complaintId: string;
  category: string;
  resolutionNotes?: string;
  resolutionPhotos: string[];
  pointsAwarded: number;
  appUrl?: string;
}

// HTML-escape to prevent injection
const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Allowed app URL domains
const ALLOWED_APP_DOMAINS = [
  'lovable.app',
  'aapnoorasto.lovable.app',
  'localhost',
];

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_APP_DOMAINS.some(d => parsed.hostname === d || parsed.hostname.endsWith('.' + d));
  } catch {
    return false;
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // --- Authentication & Authorization Check ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = claimsData.claims.sub;

    // Use service role for privileged operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller has admin or engineer role
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    const { data: isEngineer } = await supabase.rpc("has_role", { _user_id: userId, _role: "engineer" });

    if (!isAdmin && !isEngineer) {
      return new Response(
        JSON.stringify({ success: false, error: "Forbidden: admin or engineer role required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const {
      complaintId,
      category,
      resolutionNotes,
      resolutionPhotos,
      pointsAwarded,
      appUrl = "https://aapnoorasto.lovable.app",
    }: ResolutionEmailRequest = await req.json();

    // Validate required fields
    if (!complaintId || !category) {
      throw new Error("Missing required fields: complaintId and category");
    }

    // Validate appUrl against allowlist
    const safeAppUrl = isAllowedUrl(appUrl) ? appUrl : "https://aapnoorasto.lovable.app";

    // Get the complaint to find user_id
    const { data: complaint, error: complaintError } = await supabase
      .from("complaints")
      .select("user_id")
      .eq("id", complaintId)
      .single();

    if (complaintError || !complaint) {
      throw new Error(`Failed to fetch complaint: ${complaintError?.message}`);
    }

    // Get user email from auth.users
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
      complaint.user_id
    );

    if (userError || !userData?.user?.email) {
      throw new Error(`Failed to fetch user email: ${userError?.message}`);
    }

    const citizenEmail = userData.user.email;
    const formattedCategory = escapeHtml(category.replace(/([A-Z])/g, " $1").trim());
    const safeResolutionNotes = resolutionNotes ? escapeHtml(resolutionNotes) : null;

    // Build photo gallery HTML (URLs are from our own storage, validated)
    const photoGalleryHtml = resolutionPhotos.length > 0
      ? `
        <div style="margin: 20px 0;">
          <h3 style="color: #1f4d7a; margin-bottom: 12px;">📸 Resolution Proof Photos</h3>
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            ${resolutionPhotos.map((url, i) => `
              <a href="${escapeHtml(url)}" target="_blank" style="display: inline-block;">
                <img src="${escapeHtml(url)}" alt="Resolution photo ${i + 1}" 
                  style="width: 150px; height: 150px; object-fit: cover; border-radius: 8px; border: 1px solid #ddd;" />
              </a>
            `).join("")}
          </div>
        </div>
      `
      : "";

    // Build resolution notes section
    const notesHtml = safeResolutionNotes
      ? `
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #28a745;">
          <strong style="color: #1f4d7a;">Resolution Notes:</strong>
          <p style="margin: 8px 0 0 0; color: #333;">${safeResolutionNotes}</p>
        </div>
      `
      : "";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1f4d7a 0%, #2d6a9f 100%); padding: 25px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🏛️ Gujarat Government</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px;">Civic Complaint Management System</p>
        </div>
        
        <!-- Main Content -->
        <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
          <div style="text-align: center; margin-bottom: 25px;">
            <div style="display: inline-block; background: #d4edda; color: #155724; padding: 12px 24px; border-radius: 50px; font-size: 18px; font-weight: bold;">
              ✅ Your Complaint Has Been Resolved!
            </div>
          </div>
          
          <!-- Complaint Details -->
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666;">Complaint ID:</td>
                <td style="padding: 8px 0; font-weight: bold; text-align: right;">#${escapeHtml(complaintId.slice(0, 8).toUpperCase())}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Category:</td>
                <td style="padding: 8px 0; font-weight: bold; text-align: right;">${formattedCategory}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Status:</td>
                <td style="padding: 8px 0; text-align: right;">
                  <span style="background: #28a745; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px;">COMPLETED</span>
                </td>
              </tr>
            </table>
          </div>
          
          ${notesHtml}
          ${photoGalleryHtml}
          
          <!-- Points Awarded -->
          <div style="background: linear-gradient(135deg, #ffd700 0%, #ffb347 100%); padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px;">🎉</span>
            <h3 style="margin: 10px 0 5px 0; color: #333;">You've Earned Reward Points!</h3>
            <p style="font-size: 28px; font-weight: bold; color: #1f4d7a; margin: 0;">+${Number(pointsAwarded) || 0} Points</p>
            <p style="font-size: 12px; color: #666; margin-top: 8px;">Redeem for 30% discount on government services</p>
          </div>
          
          <!-- CTA Button -->
          <div style="text-align: center; margin: 25px 0;">
            <a href="${escapeHtml(safeAppUrl)}/citizen" 
               style="display: inline-block; background: #1f4d7a; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
              View Full Details
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; text-align: center; margin-top: 25px;">
            Thank you for helping improve our city! Your civic participation makes a difference.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 12px 12px; text-align: center; border: 1px solid #e0e0e0; border-top: none;">
          <p style="margin: 0; color: #666; font-size: 12px;">
            Gujarat Government Civic Services<br>
            This is an automated notification. Please do not reply to this email.
          </p>
        </div>
      </body>
      </html>
    `;

    // Send email via Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Gujarat Civic Services <onboarding@resend.dev>",
        to: [citizenEmail],
        subject: `✅ Your Complaint Has Been Resolved - #${complaintId.slice(0, 8).toUpperCase()}`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      throw new Error(`Resend API error: ${errorData}`);
    }

    const emailResult = await emailResponse.json();

    console.log("Resolution email sent successfully:", emailResult);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResult.id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-resolution-email function:", errorMessage);
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
