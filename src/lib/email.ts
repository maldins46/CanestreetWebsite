import nodemailer from 'nodemailer'
import type { TeamCategory, TeamStatus } from '@/types'

interface PlayerEmailData {
  name: string
  birth_date: string
  codice_fiscale: string
  city?: string | null
  email?: string | null
  phone?: string | null
  instagram?: string | null
  club?: string | null
  is_captain: boolean
  is_vice_captain: boolean
}

function playerRole(p: PlayerEmailData): string {
  if (p.is_captain) return 'Capitano'
  if (p.is_vice_captain) return 'Vice'
  return 'Giocatore'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT')
}

function playersTextTable(players: PlayerEmailData[]): string {
  return players
    .map(p => {
      const lines = [
        `  ${playerRole(p)}: ${p.name}`,
        `    Nato il: ${formatDate(p.birth_date)}`,
        `    CF: ${p.codice_fiscale}`,
      ]
      if (p.city) lines.push(`    Città: ${p.city}`)
      if (p.email) lines.push(`    Email: ${p.email}`)
      if (p.phone) lines.push(`    Telefono: ${p.phone}`)
      if (p.instagram) lines.push(`    Instagram: ${p.instagram}`)
      if (p.club) lines.push(`    Club: ${p.club}`)
      return lines.join('\n')
    })
    .join('\n\n')
}

function playersHtmlCards(players: PlayerEmailData[]): string {
  const labelStyle = 'width:130px;padding:6px 10px;font-size:12px;color:#666;vertical-align:top;white-space:nowrap'
  const valueStyle = 'padding:6px 10px;font-size:13px;vertical-align:top'

  const row = (label: string, value: string) =>
    `<tr><td style="${labelStyle}">${label}</td><td style="${valueStyle}">${value}</td></tr>`

  const cards = players
    .map(p => {
      const rows = [
        row('Nato il', formatDate(p.birth_date)),
        row('Codice Fiscale', `<code style="font-size:12px">${p.codice_fiscale}</code>`),
        ...(p.city ? [row('Città', p.city)] : []),
        ...(p.email ? [row('Email', p.email)] : []),
        ...(p.phone ? [row('Telefono', p.phone)] : []),
        ...(p.instagram ? [row('Instagram', p.instagram)] : []),
        ...(p.club ? [row('Club', p.club)] : []),
      ].join('\n')

      return `<table width="100%" style="border-collapse:collapse;margin-bottom:12px;border:1px solid #ddd;font-family:Arial,sans-serif">
  <tr><td colspan="2" style="padding:8px 10px;background:#333;color:#fff;font-size:13px;font-weight:bold">${playerRole(p)} — ${p.name}</td></tr>
  ${rows}
</table>`
    })
    .join('\n')

  return `<div style="margin-top:16px">${cards}</div>`
}

const gmailUser = process.env.GMAIL_USER
const gmailAppPassword = process.env.GMAIL_APP_PASSWORD

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null

function getTransporter() {
  if (process.env.DISABLE_EMAILS === 'true') {
    console.warn('[email] DISABLE_EMAILS=true, skipping send')
    return null
  }

  if (!gmailUser || !gmailAppPassword) {
    console.warn('[email] Gmail credentials not configured, email sending disabled')
    return null
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    })
  }

  return transporter
}

const categoryLabels: Record<TeamCategory, string> = {
  open_m: 'Open Maschile',
  open_f: 'Open Femminile',
  u14_m: 'U14 Maschile',
  u16_m: 'U16 Maschile',
  u18_m: 'U18 Maschile',
}

interface RegistrationAdminData {
  teamName: string
  category: TeamCategory
  captainEmail: string
  captainPhone?: string | null
  playerCount: number
  players?: PlayerEmailData[]
}

export async function sendRegistrationAdminNotification(
  data: RegistrationAdminData
): Promise<{ success: boolean; error?: string }> {
  const transporter = getTransporter()
  if (!transporter) return { success: true } // graceful skip

  try {
    const categoryLabel = categoryLabels[data.category] || data.category
    const now = new Date().toLocaleString('it-IT')

    const rosterText = data.players?.length
      ? `\nROSTER:\n\n${playersTextTable(data.players)}`
      : `\nGiocatori: ${data.playerCount}`

    const text = `Nuova iscrizione al torneo Canestreet 3×3

Squadra: ${data.teamName}
Categoria: ${categoryLabel}
Email capitano: ${data.captainEmail}
Telefono capitano: ${data.captainPhone || 'non fornito'}
Orario iscrizione: ${now}
${rosterText}

Visita il backoffice per approvare o rifiutare l'iscrizione. Oppure mmazzade

---
Questo messaggio è stato generato automaticamente.`

    const rosterHtml = data.players?.length
      ? `<h2 style="margin-top:24px;font-size:16px">Roster (${data.players.length} giocatori)</h2>${playersHtmlCards(data.players)}`
      : `<p><strong>Giocatori:</strong> ${data.playerCount}</p>`

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Barlow, Arial, sans-serif; color: #333; line-height: 1.6;">
  <div style="max-width: 800px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
    <div style="background: #333; color: white; padding: 20px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px;">Nuova Iscrizione 🏀🦁</h1>
    </div>
    <div style="padding: 20px;">
      <p><strong>Squadra:</strong> ${data.teamName}</p>
      <p><strong>Categoria:</strong> ${categoryLabel}</p>
      <p><strong>Email capitano:</strong> ${data.captainEmail}</p>
      <p><strong>Telefono capitano:</strong> ${data.captainPhone || 'non fornito'}</p>
      <p><strong>Orario iscrizione:</strong> ${now}</p>
      ${rosterHtml}
      <p style="margin-top: 30px; font-size: 14px; color: #333;">
        Accedi al backoffice per approvare, rifiutare o inserire in lista d'attesa l'iscrizione. Oppure mazzade
      </p>
      <p style="margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px; font-size: 12px; color: #999;">
        Questo messaggio è stato generato automaticamente.
      </p>
    </div>
  </div>
</body>
</html>`

    await transporter.sendMail({
      from: `Canestreet 3×3 <${gmailUser}>`,
      to: gmailUser,
      subject: `Nuova iscrizione: ${data.teamName} (${categoryLabel})`,
      text,
      html,
    })

    return { success: true }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[email] Failed to send registration admin notification:', msg)
    return { success: false, error: msg }
  }
}

interface RegistrationCaptainData {
  teamName: string
  category: TeamCategory
  captainEmail: string
  players?: PlayerEmailData[]
}

export async function sendRegistrationConfirmation(
  data: RegistrationCaptainData
): Promise<{ success: boolean; error?: string }> {
  const transporter = getTransporter()
  if (!transporter) return { success: true } // graceful skip

  try {
    const categoryLabel = categoryLabels[data.category] || data.category

    const rosterText = data.players?.length
      ? `\nRiepilogo giocatori registrati:\n\n${playersTextTable(data.players)}\n`
      : ''

    const text = `Canestreet 3×3 — Richiesta di iscrizione ricevuta

Ciao!
La tua richiesta di iscrizione con la squadra "${data.teamName}" nella categoria "${categoryLabel}" è stata registrata con successo.
${rosterText}
Ti contatteremo presto per confermare l'accettazione o comunicarti lo stato della tua iscrizione.

A presto!

---
Questo messaggio è stato generato automaticamente. Puoi rispondere direttamente a questa email per qualsiasi chiarimento.`

    const rosterHtml = data.players?.length
      ? `<h2 style="margin-top:24px;font-size:16px">Riepilogo giocatori registrati</h2>${playersHtmlCards(data.players)}`
      : ''

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Barlow, Arial, sans-serif; color: #333; line-height: 1.6;">
  <div style="max-width: 800px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
    <div style="background: #333; color: white; padding: 20px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px;">Richiesta di iscrizione Ricevuta 🏀🦁</h1>
    </div>
    <div style="padding: 20px;">
      <p>Ciao!</p>
      <p>La tua richiesta d'iscrizione con la squadra <strong>"${data.teamName}"</strong> nella categoria <strong>"${categoryLabel}"</strong> è stata registrata con successo.</p>
      ${rosterHtml}
      <p style="margin-top:24px">Ti contatteremo presto per confermare l'accettazione o comunicarti lo stato della tua iscrizione.</p>
      <p style="margin-top: 20px; border-top: 1px solid #ddd; padding-top: 20px; font-size: 12px; color: #999;">
        Questo messaggio è stato generato automaticamente. Puoi rispondere direttamente a questa email per qualsiasi chiarimento.
      </p>
    </div>
  </div>
</body>
</html>`

    await transporter.sendMail({
      from: `Canestreet 3×3 <${gmailUser}>`,
      to: data.captainEmail,
      subject: 'Canestreet 3×3 — Iscrizione ricevuta',
      text,
      html,
    })

    return { success: true }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[email] Failed to send registration confirmation:', msg)
    return { success: false, error: msg }
  }
}

interface StatusChangeData {
  teamName: string
  captainEmail: string
  newStatus: TeamStatus
}

export async function sendStatusChangeNotification(
  data: StatusChangeData
): Promise<{ success: boolean; error?: string }> {
  const transporter = getTransporter()
  if (!transporter) return { success: true } // graceful skip

  try {
    let subject: string
    let message: string

    switch (data.newStatus) {
      case 'approved':
        subject = 'Canestreet 3×3 — Iscrizione Approvata! 🎉'
        message = `La squadra "${data.teamName}" è stata approvata! Vi aspettiamo in piazza, a presto!`
        break
      case 'rejected':
        subject = 'Canestreet 3×3 — Iscrizione Non Accettata'
        message = `Purtroppo la squadra "${data.teamName}" non è stata accettata per questa edizione del torneo. Per informazioni contattaci a ${gmailUser}.`
        break
      case 'waitlisted':
        subject = 'Canestreet 3×3 — Lista d\'Attesa'
        message = `La squadra "${data.teamName}" è stata inserita in lista d'attesa. Vi aggiorneremo al più presto in caso di posti disponibili.`
        break
      default:
        return { success: false, error: `Unknown status: ${data.newStatus}` }
    }

    const text = `Canestreet 3×3 — Aggiornamento Iscrizione 🏀🦁

${message}

Grazie!

---
Questo messaggio è stato generato automaticamente. Puoi rispondere direttamente a questa email per qualsiasi chiarimento.`

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Barlow, Arial, sans-serif; color: #333; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
    <div style="background: #333; color: white; padding: 20px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px;">Aggiornamento Iscrizione 🏀🦁</h1>
    </div>
    <div style="padding: 20px;">
      <p>${message}</p>
      <p style="margin-top: 20px; border-top: 1px solid #ddd; padding-top: 20px; font-size: 12px; color: #999;">
        Questo messaggio è stato generato automaticamente. Puoi rispondere direttamente a questa email per qualsiasi chiarimento.
      </p>
    </div>
  </div>
</body>
</html>`

    await transporter.sendMail({
      from: `Canestreet 3×3 <${gmailUser}>`,
      to: data.captainEmail,
      subject,
      text,
      html,
    })

    return { success: true }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[email] Failed to send status change notification:', msg)
    return { success: false, error: msg }
  }
}
