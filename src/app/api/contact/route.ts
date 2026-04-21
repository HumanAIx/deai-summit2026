import { NextResponse } from 'next/server';

const EXTERNAL_API_URL = process.env.NEXT_PUBLIC_GCONF_API_URL || '';
const API_KEY = process.env.NEXT_PUBLIC_GCONF_API_KEY || '';

// Thin proxy to ep-api's generic form-submission endpoint. Email delivery, captcha
// verification, rate-limiting, and submission logging all happen centrally on ep-api
// using each tenant's own configuration — this project no longer ships with Resend.
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { firstName, lastName, email, message, captchaToken, ...rest } = body;

        if (!firstName || !lastName || !email || !message) {
            return NextResponse.json({ error: 'Missing required fields', success: false }, { status: 400 });
        }

        const response = await fetch(`${EXTERNAL_API_URL}/forms/contact/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
            },
            body: JSON.stringify({
                submission_data: { firstName, lastName, email, message, ...rest },
                captcha_token: captchaToken,
            }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            return NextResponse.json(
                { error: data.error || 'Failed to submit form', success: false },
                { status: response.status }
            );
        }

        return NextResponse.json({
            success: true,
            message: data.message || 'Message sent successfully',
        });
    } catch (error) {
        console.error('Contact proxy error:', error);
        return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 });
    }
}
