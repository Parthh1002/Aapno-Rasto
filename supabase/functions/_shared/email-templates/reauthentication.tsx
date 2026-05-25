/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your verification code for Aapno Rasto</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={brandName}>🏛️ Aapno Rasto</Heading>
          <Text style={brandTagline}>Government of Gujarat — Civic Services</Text>
        </Section>
        <Section style={content}>
          <Heading style={h1}>Confirm your identity</Heading>
          <Text style={text}>Use the code below to verify your identity:</Text>
          <Text style={codeStyle}>{token}</Text>
          <Text style={footer}>
            This code will expire shortly. If you didn't request this, you can safely ignore this email.
          </Text>
        </Section>
        <Section style={govFooterSection}>
          <Text style={govFooter}>Your Voice, Our Action • તમારો અવાજ, અમારી કાર્યવાહી</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Poppins', Arial, sans-serif" }
const container = { padding: '0', maxWidth: '480px', margin: '0 auto' }
const header = { backgroundColor: '#002147', padding: '24px 20px 16px', textAlign: 'center' as const, borderRadius: '12px 12px 0 0' }
const brandName = { fontSize: '20px', fontWeight: 'bold' as const, color: '#ffffff', margin: '0' }
const brandTagline = { fontSize: '12px', color: 'rgba(255,255,255,0.8)', margin: '4px 0 0' }
const content = { padding: '24px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#002147', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#5c6b82', lineHeight: '1.6', margin: '0 0 20px' }
const codeStyle = {
  fontFamily: "'Poppins', Courier, monospace",
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: '#002147',
  backgroundColor: '#f0f4f8',
  padding: '12px 20px',
  borderRadius: '12px',
  letterSpacing: '6px',
  textAlign: 'center' as const,
  margin: '0 0 24px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '24px 0 0' }
const govFooterSection = { backgroundColor: '#f8f9fa', padding: '12px 25px', borderRadius: '0 0 12px 12px', borderTop: '3px solid #FF9933' }
const govFooter = { fontSize: '11px', color: '#999999', textAlign: 'center' as const, margin: '0' }
