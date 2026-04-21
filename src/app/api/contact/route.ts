import { NextResponse } from 'next/server';

const EXTERNAL_API_URL = process.env.NEXT_PUBLIC_GCONF_API_URL || '';
const API_KEY = process.env.NEXT_PUBLIC_GCONF_API_KEY || '';
const FORM_SLUG = 'get-in-touch';

// Client keys (sent from ContactClient) mapped to the normalized labels we expect on the
// ep-api form. The proxy resolves each client key to whatever internal `field.name` the
// form builder generated (e.g. `field_1`) by matching the normalized label.
const CLIENT_KEY_LABELS: Record<string, string[]> = {
    firstName: ['first name', 'firstname', 'given name'],
    lastName: ['last name', 'lastname', 'surname', 'family name'],
    email: ['email', 'email address', 'e-mail'],
    company: ['company', 'organization', 'organisation'],
    phone: ['phone', 'phone number', 'telephone', 'mobile'],
    inquiryType: ['inquiry type', 'enquiry type', 'type', 'subject', 'topic'],
    message: ['message', 'comments', 'comment', 'details', 'body'],
};

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

interface FormField { name: string; label: string; required?: boolean }

async function fetchFormFields(): Promise<FormField[]> {
    const res = await fetch(`${EXTERNAL_API_URL}/forms/${FORM_SLUG}`, {
        headers: { 'Authorization': `Bearer ${API_KEY}` },
        cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = await res.json().catch(() => ({}));
    return (json?.data?.form_fields as FormField[]) || [];
}

function mapClientKeysToFieldNames(
    clientData: Record<string, unknown>,
    fields: FormField[],
): Record<string, unknown> {
    const byNormalizedLabel = new Map(fields.map(f => [normalize(f.label || ''), f.name]));
    const byName = new Set(fields.map(f => f.name));
    const result: Record<string, unknown> = {};

    for (const [clientKey, value] of Object.entries(clientData)) {
        if (value === undefined || value === null || value === '') continue;

        // 1. Exact name match — client key already matches a backend field name.
        if (byName.has(clientKey)) {
            result[clientKey] = value;
            continue;
        }

        // 2. Label-tolerant match via the client-key dictionary.
        const candidateLabels = CLIENT_KEY_LABELS[clientKey] || [normalize(clientKey)];
        let resolved: string | undefined;
        for (const label of candidateLabels) {
            const fieldName = byNormalizedLabel.get(normalize(label));
            if (fieldName) { resolved = fieldName; break; }
        }

        if (resolved) {
            result[resolved] = value;
        } else {
            // Pass through unresolved keys — backend will ignore unknown fields.
            result[clientKey] = value;
        }
    }

    return result;
}

// Thin proxy to ep-api's generic form-submission endpoint. Email delivery, captcha
// verification, rate-limiting, and submission logging all happen centrally on ep-api
// using each tenant's own configuration — this project no longer ships with Resend.
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { captchaToken, ...clientData } = body;

        const { firstName, lastName, email, message } = clientData;
        if (!firstName || !lastName || !email || !message) {
            return NextResponse.json({ error: 'Missing required fields', success: false }, { status: 400 });
        }

        const fields = await fetchFormFields();
        const submissionData = fields.length > 0
            ? mapClientKeysToFieldNames(clientData, fields)
            : clientData;

        const response = await fetch(`${EXTERNAL_API_URL}/forms/${FORM_SLUG}/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
            },
            body: JSON.stringify({
                submission_data: submissionData,
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
