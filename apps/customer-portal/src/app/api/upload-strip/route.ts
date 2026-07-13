import { NextRequest, NextResponse } from 'next/server'

const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || ''
const MAX_PAYLOAD_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(req: NextRequest) {
    if (!APPS_SCRIPT_URL) {
        return NextResponse.json({ ok: false, error: 'URL not configured' }, { status: 500 })
    }

    // 1. Content-Type Validation
    const contentType = req.headers.get('content-type')
    if (!contentType?.includes('application/json')) {
        return NextResponse.json({ error: 'Invalid content type. Expected application/json' }, { status: 400 })
    }

    // 2. Payload Size Validation
    const rawBody = await req.text()
    // Approximate byte length (Node.js Buffer is available in edge/server runtimes generally, but let's use string length as a fast proxy)
    // 1 char roughly 1 byte for base64, plus some overhead
    if (rawBody.length > MAX_PAYLOAD_SIZE) {
        return NextResponse.json({ error: 'Payload too large. Maximum size is 5MB' }, { status: 413 })
    }

    let body
    try {
        body = JSON.parse(rawBody)
    } catch (err) {
        return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    // 3. Schema/Type Validation
    const { fileName, mimeType, data, promoConsent } = body
    if (!data || typeof data !== 'string') {
        return NextResponse.json({ error: 'Missing or invalid image data' }, { status: 400 })
    }
    if (mimeType !== 'image/png' && mimeType !== 'image/jpeg') {
        return NextResponse.json({ error: 'Invalid file type. Only PNG and JPEG are allowed' }, { status: 400 })
    }

    const payload = JSON.stringify({ fileName, mimeType, data, folderId: '1IAamhoERgEodQUJg1OOLGZIfwk-Z1TC6', promoConsent })

    // Apps Script returns 302 redirect; default fetch converts POST→GET (losing body).
    // Use redirect: 'manual' and follow the redirect ourselves with POST preserved.
    let res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        body: payload,
        redirect: 'manual',
    })

    // Follow up to 5 redirects, preserving POST method + body
    let redirects = 0
    while ((res.status === 301 || res.status === 302 || res.status === 307 || res.status === 308) && redirects < 5) {
        const location = res.headers.get('location')
        if (!location) break
        res = await fetch(location, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            body: payload,
            redirect: 'manual',
        })
        redirects++
    }

    const text = await res.text()
    return new Response(text, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    })
}
