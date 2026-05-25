/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your login link for Aapno Rasto</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={brandName}>🏛️ Aapno Rasto</Heading>
          <Text style={brandTagline}>Government of Gujarat — Civic Services</Text>
        </Section>
        <Section style={content}>
          <Heading style={h1}>Your login link</Heading>
          <Text style={text}>
            Click the button below to log in to Aapno Rasto. This link will expire shortly.
          </Text>
          <Button style={button} href={confirmationUrl}>
            Log In
          </Button>
          <Text style={footer}>
            If you didn't request this link, you can safely ignore this email.
          </Text>
        </Section>
        <Section style={govFooterSection}>
          <Text style={govFooter}>Your Voice, Our Action • તમારો અવાજ, અમારી કાર્યવાહી</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Poppins', Arial, sans-serif" }
const container = { padding: '0', maxWidth: '480px', margin: '0 auto' }
const header = { backgroundColor: '#002147', padding: '24px 20px 16px', textAlign: 'center' as const, borderRadius: '12px 12px 0 0' }
const brandName = { fontSize: '20px', fontWeight: 'bold' as const, color: '#ffffff', margin: '0' }
const brandTagline = { fontSize: '12px', color: 'rgba(255,255,255,0.8)', margin: '4px 0 0' }
const content = { padding: '24px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#002147', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#5c6b82', lineHeight: '1.6', margin: '0 0 20px' }
const button = { backgroundColor: '#002147', color: '#ffffff', fontSize: '14px', fontWeight: '600' as const, borderRadius: '12px', padding: '12px 24px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#999999', margin: '24px 0 0' }
const govFooterSection = { backgroundColor: '#f8f9fa', padding: '12px 25px', borderRadius: '0 0 12px 12px', borderTop: '3px solid #FF9933' }
const govFooter = { fontSize: '11px', color: '#999999', textAlign: 'center' as const, margin: '0' }
