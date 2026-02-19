import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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

        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
        const fromName = process.env.RESEND_FROM_NAME || 'DeAI Summit';
        const toEmail = process.env.RESEND_TO_EMAIL || fromEmail;

        if (!process.env.RESEND_API_KEY) {
            console.error('Resend API key is missing');
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

        const emailContent = `
            <strong>New Contact Form Submission</strong><br><br>
            <strong>Name:</strong> ${firstName} ${lastName}<br>
            <strong>Email:</strong> ${email}<br>
            <strong>Inquiry Type:</strong> ${inquiryType}<br>
            <strong>Message:</strong><br>
            ${message.replace(/\n/g, '<br>')}
        `;

        const { data, error } = await resend.emails.send({
            from: `${fromName} <${fromEmail}>`,
            to: toEmail,
            subject: `[DEAI Summit] Contact: ${inquiryType} from ${firstName} ${lastName}`,
            html: emailContent,
            replyTo: email,
        });

        if (error) {
            console.error('Resend Error:', error);
            return NextResponse.json(
                { error: 'Failed to send message' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, message: 'Email sent successfully', id: data?.id });
    } catch (error: any) {
        console.error('Internal Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
