import { NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { firstName, lastName, email, inquiryType, message } = body;

        // Validate required fields
        if (!firstName || !lastName || !email || !message) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const apiKey = process.env.SENDGRID_API_KEY;
        const fromEmail = process.env.SENDGRID_FROM_EMAIL;
        const toEmail = process.env.SENDGRID_TO_EMAIL || fromEmail;

        if (!apiKey || !fromEmail) {
            console.error('SendGrid API key or From Email is missing');
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

        sgMail.setApiKey(apiKey);

        const emailContent = `
      <strong>New Contact Form Submission</strong><br><br>
      <strong>Name:</strong> ${firstName} ${lastName}<br>
      <strong>Email:</strong> ${email}<br>
      <strong>Inquiry Type:</strong> ${inquiryType}<br>
      <strong>Message:</strong><br>
      ${message.replace(/\n/g, '<br>')}
    `;

        const msg = {
            to: toEmail,
            from: fromEmail,
            subject: `[DEAI Summit] Contact: ${inquiryType} from ${firstName} ${lastName}`,
            html: emailContent,
            replyTo: email,
        };

        await sgMail.send(msg);

        return NextResponse.json({ success: true, message: 'Email sent successfully' });
    } catch (error: any) {
        console.error('SendGrid Error:', error);
        if (error.response) {
            console.error(error.response.body);
        }
        return NextResponse.json(
            { error: 'Failed to send message' },
            { status: 500 }
        );
    }
}
