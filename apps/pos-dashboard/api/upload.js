export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).send('Method not allowed')
    }

    const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || process.env.VITE_APPS_SCRIPT_URL || ''
    if (!APPS_SCRIPT_URL) {
        return res.status(500).json({ ok: false, error: 'URL not configured' })
    }

    const body = req.body
    const payload = JSON.stringify(body)

    // Apps Script returns 302 redirect; follow manually preserving POST + body
    let response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        body: payload,
        redirect: 'manual',
    })

    let redirects = 0
    while ((response.status === 301 || response.status === 302 || response.status === 307 || response.status === 308) && redirects < 5) {
        const location = response.headers.get('location')
        if (!location) break
        response = await fetch(location, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            body: payload,
            redirect: 'manual',
        })
        redirects++
    }

    const text = await response.text()
    res.setHeader('Content-Type', 'application/json')
    res.status(200).send(text)
}
