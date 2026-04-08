import { NextRequest, NextResponse } from 'next/server'

const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || ''

export async function POST(req: NextRequest) {
    if (!APPS_SCRIPT_URL) {
        return NextResponse.json({ ok: false, error: 'URL not configured' }, { status: 500 })
    }

    const body = await req.json()
    const payload = JSON.stringify(body)

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
