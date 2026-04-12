import nodemailer from 'nodemailer'
import type { TeamCategory, TeamStatus } from '@/types'

const gmailUser = process.env.GMAIL_USER
const gmailAppPassword = process.env.GMAIL_APP_PASSWORD

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null

function getTransporter() {
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
}

export async function sendRegistrationAdminNotification(
  data: RegistrationAdminData
): Promise<{ success: boolean; error?: string }> {
  const transporter = getTransporter()
  if (!transporter) return { success: true } // graceful skip

  try {
    const categoryLabel = categoryLabels[data.category] || data.category
    const now = new Date().toLocaleString('it-IT')

    const text = `Nuova iscrizione al torneo Canestreet 3x3

Squadra: ${data.teamName}
Categoria: ${categoryLabel}
Giocatori: ${data.playerCount}
Email capitano: ${data.captainEmail}
Telefono capitano: ${data.captainPhone || 'non fornito'}
Orario iscrizione: ${now}

Visita il backoffice per approvare o rifiutare l'iscrizione.`

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Barlow, Arial, sans-serif; color: #333; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
    <div style="background: #FF6B35; color: white; padding: 20px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px;">Nuova Iscrizione 🏀🦁</h1>
    </div>
    <div style="padding: 20px;">
      <p><strong>Squadra:</strong> ${data.teamName}</p>
      <p><strong>Categoria:</strong> ${categoryLabel}</p>
      <p><strong>Giocatori:</strong> ${data.playerCount}</p>
      <p><strong>Email capitano:</strong> ${data.captainEmail}</p>
      <p><strong>Telefono capitano:</strong> ${data.captainPhone || 'non fornito'}</p>
      <p><strong>Orario iscrizione:</strong> ${now}</p>
      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        Accedi al backoffice per approvare, rifiutare o inserire in lista d'attesa l'iscrizione.
      </p>
    </div>
  </div>
</body>
</html>`

    await transporter.sendMail({
      from: gmailUser,
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
}

export async function sendRegistrationConfirmation(
  data: RegistrationCaptainData
): Promise<{ success: boolean; error?: string }> {
  const transporter = getTransporter()
  if (!transporter) return { success: true } // graceful skip

  try {
    const categoryLabel = categoryLabels[data.category] || data.category

    const text = `Canestreet 3x3 — Richiesta di iscrizione ricevuta

Ciao!
La tua richiesta di iscrizione con la squadra "${data.teamName}" nella categoria "${categoryLabel}" è stata registrata con successo.

Ti contatteremo presto per confermare l'accettazione o comunicarti lo stato della tua iscrizione.

Per qualsiasi domanda contattaci a: canestreet3vs3@gmail.com

A presto! 🏀🦁`

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Barlow, Arial, sans-serif; color: #333; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
    <div style="background: #FF6B35; color: white; padding: 20px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px;">Iscrizione Ricevuta 🏀🦁</h1>
    </div>
    <div style="padding: 20px;">
      <p>Ciao!</p>
      <p>La tua richiesta d'iscrizione con la squadra <strong>"${data.teamName}"</strong> nella categoria <strong>"${categoryLabel}"</strong> è stata registrata con successo.</p>
      <p>Ti contatteremo presto per confermare l'accettazione o comunicarti lo stato della tua iscrizione.</p>
      <p style="margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px; font-size: 14px; color: #666;">
        Per qualsiasi domanda contattaci a: <strong>canestreet3vs3@gmail.com</strong>
      </p>
      <p style="text-align: center; font-size: 40px; margin-top: 20px;">🏀</p>
    </div>
  </div>
</body>
</html>`

    await transporter.sendMail({
      from: gmailUser,
      to: data.captainEmail,
      subject: 'Canestreet 3x3 — Iscrizione ricevuta',
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
        subject = 'Canestreet 3vs3 — Iscrizione Approvata! 🎉'
        message = `La squadra "${data.teamName}" è stata approvata! Vi aspettiamo in piazza, a presto 🏀🦁`
        break
      case 'rejected':
        subject = 'Canestreet 3vs3 — Iscrizione Non Accettata'
        message = `Purtroppo la squadra "${data.teamName}" non è stata accettata per questa edizione del torneo. Per informazioni contattaci a canestreet3vs3@gmail.com.`
        break
      case 'waitlisted':
        subject = 'Canestreet 3vs3 — Lista d\'Attesa'
        message = `La squadra "${data.teamName}" è stata inserita in lista d'attesa. Vi aggiorneremo al più presto in caso di posti disponibili.`
        break
      default:
        return { success: false, error: `Unknown status: ${data.newStatus}` }
    }

    const text = `Canestreet 3x3 — Aggiornamento Iscrizione

${message}

Per qualsiasi domanda contattaci a: canestreet3vs3@gmail.com

Grazie! 🏀🦁`

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Barlow, Arial, sans-serif; color: #333; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
    <div style="background: #FF6B35; color: white; padding: 20px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px;">Aggiornamento Iscrizione 🏀🦁</h1>
    </div>
    <div style="padding: 20px;">
      <p>${message}</p>
      <p style="margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px; font-size: 14px; color: #666;">
        Per qualsiasi domanda contattaci a: <strong>canestreet3vs3@gmail.com</strong>
      </p>
    </div>
  </div>
</body>
</html>`

    await transporter.sendMail({
      from: gmailUser,
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
