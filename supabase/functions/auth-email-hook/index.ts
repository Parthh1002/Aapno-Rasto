import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { sendLovableEmail, parseEmailWebhookPayload } from 'npm:@lovable.dev/email-js'
import { WebhookError, verifyWebhookRequest } from 'npm:@lovable.dev/webhooks-js'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { EmailChangeEmail } from '../_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-lovable-signature, x-lovable-timestamp, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const EMAIL_SUBJECTS: Record<string, string> = {
  signup: 'Confirm your email',
  invite: "You've been invited",
  magiclink: 'Your login link',
  recovery: 'Reset your password',
  email_change: 'Confirm your new email',
  reauthentication: 'Your verification code',
}

// Template mapping
const EMAIL_TEMPLATES: Record<string, React.ComponentType<any>> = {
  signup: SignupEmail,
  invite: InviteEmail,
  magiclink: MagicLinkEmail,
  recovery: RecoveryEmail,
  email_change: EmailChangeEmail,
  reauthentication: ReauthenticationEmail,
}

// Configuration
const SITE_NAME = "aapnoorasto"
const SENDER_DOMAIN = "notify.aapnorasto.com"
const ROOT_DOMAIN = "aapnorasto.com"
const FROM_DOMAIN = "aapnorasto.com" // Domain shown in From address (may be root or sender subdomain)

// Sample data for preview mode ONLY (not used in actual email sending).
// URLs are baked in at scaffold time from the project's real data.
// The sample email uses a fixed placeholder (RFC 6761 .test TLD) so the Go backend
// can always find-and-replace it with the actual recipient when sending test emails,
// even if the project's domain has changed since the template was scaffolded.
const SAMPLE_PROJECT_URL = "https://aapnoorasto.lovable.app"
const SAMPLE_EMAIL = "user@example.test"
const SAMPLE_DATA: Record<string, object> = {
  signup: {
    siteName: SITE_NAME,
    siteUrl: SAMPLE_PROJECT_URL,
    recipient: SAMPLE_EMAIL,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  magiclink: {
    siteName: SITE_NAME,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  recovery: {
    siteName: SITE_NAME,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  invite: {
    siteName: SITE_NAME,
    siteUrl: SAMPLE_PROJECT_URL,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  email_change: {
    siteName: SITE_NAME,
    email: SAMPLE_EMAIL,
    newEmail: SAMPLE_EMAIL,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  reauthentication: {
    token: '123456',
  },
}

// Preview endpoint handler - returns rendered HTML without sending email
async function handlePreview(req: Request): Promise<Response> {
  const previewCorsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: previewCorsHeaders })
  }

  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  const authHeader = req.headers.get('Authorization')

  if (!apiKey || authHeader !== `Bearer ${apiKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let type: string
  try {
    const body = await req.json()
    type = body.type
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
      status: 400,
      headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const EmailTemplate = EMAIL_TEMPLATES[type]

  if (!EmailTemplate) {
    return new Response(JSON.stringify({ error: `Unknown email type: ${type}` }), {
      status: 400,
      headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const sampleData = SAMPLE_DATA[type] || {}
  const html = await renderAsync(React.createElement(EmailTemplate, sampleData))

  return new Response(html, {
    status: 200,
    headers: { ...previewCorsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
  })
}

// Webhook handler - verifies signature and sends email
async function handleWebhook(req: Request): Promise<Response> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY')

  if (!apiKey) {
    console.error('LOVABLE_API_KEY not configured')
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Verify signature + timestamp, then parse payload.
  let payload: any
  let run_id = ''
  try {
    const verified = await verifyWebhookRequest({
      req,
      secret: apiKey,
      parser: parseEmailWebhookPayload,
    })
    payload = verified.payload
    run_id = payload.run_id
  } catch (error) {
    if (error instanceof WebhookError) {
      switch (error.code) {
        case 'invalid_signature':
        case 'missing_timestamp':
        case 'invalid_timestamp':
        case 'stale_timestamp':
          console.error('Invalid webhook signature', { error: error.message })
          return new Response(JSON.stringify({ error: 'Invalid signature' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        case 'invalid_payload':
        case 'invalid_json':
          console.error('Invalid webhook payload', { error: error.message })
          return new Response(
            JSON.stringify({ error: 'Invalid webhook payload' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
      }
    }

    console.error('Webhook verification failed', { error })
    return new Response(
      JSON.stringify({ error: 'Invalid webhook payload' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (!run_id) {
    console.error('Webhook payload missing run_id')
    return new Response(
      JSON.stringify({ error: 'Invalid webhook payload' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  if (payload.version !== '1') {
    console.error('Unsupported payload version', { version: payload.version, run_id })
    return new Response(
      JSON.stringify({ error: `Unsupported payload version: ${payload.version}` }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  // The email action type is in payload.data.action_type (e.g., "signup", "recovery")
  // payload.type is the hook event type ("auth")
  const emailType = payload.data.action_type
  console.log('Received auth event', { emailType, email: payload.data.email, run_id })

  const EmailTemplate = EMAIL_TEMPLATES[emailType]
  if (!EmailTemplate) {
    console.error('Unknown email type', { emailType, run_id })
    return new Response(
      JSON.stringify({ error: `Unknown email type: ${emailType}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Build template props from payload.data (HookData structure)
  const templateProps = {
    siteName: SITE_NAME,
    siteUrl: `https://${ROOT_DOMAIN}`,
    recipient: payload.data.email,
    confirmationUrl: payload.data.url,
    token: payload.data.token,
    email: payload.data.email,
    newEmail: payload.data.new_email,
  }

  // Render React Email to HTML and plain text
  const html = await renderAsync(React.createElement(EmailTemplate, templateProps))
  const text = await renderAsync(React.createElement(EmailTemplate, templateProps), {
    plainText: true,
  })

  // Send email via Lovable Email API
  // The callback URL is provided in the payload by Lovable, ensuring correct routing
  // for both production and local development
  const callbackUrl = payload.data.callback_url
  if (!callbackUrl) {
    console.error('No callback_url in payload', { run_id })
    return new Response(JSON.stringify({ error: 'Missing callback_url in payload' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let result: { message_id?: string }
  try {
    result = await sendLovableEmail(
      {
        run_id,
        to: payload.data.email,
        from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject: EMAIL_SUBJECTS[emailType] || 'Notification',
        html,
        text,
        purpose: 'transactional',
      },
      { apiKey, sendUrl: callbackUrl }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send email'
    console.error('Email API error', { error: message, run_id })
    return new Response(JSON.stringify({ error: 'Failed to send email' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  console.log('Email sent successfully', { message_id: result.message_id, run_id })

  return new Response(
    JSON.stringify({ success: true, message_id: result.message_id }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

Deno.serve(async (req) => {
  const url = new URL(req.url)

  // Handle CORS preflight for main endpoint
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Route to preview handler for /preview path
  if (url.pathname.endsWith('/preview')) {
    return handlePreview(req)
  }

  // Main webhook handler
  try {
    return await handleWebhook(req)
  } catch (error) {
    console.error('Webhook handler error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
