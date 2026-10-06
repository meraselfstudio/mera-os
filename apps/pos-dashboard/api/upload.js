export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).send('Method not allowed')
    }

    const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || process.env.VITE_APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbyx4N3y36gLlo5gwRxBXbc1ipgga_bBM3lH1mR5sspSg7ETDNxV5iWWP7YDtutDnUu8/exec'

    try {
        const body = req.body
        const payload = typeof body === 'string' ? body : JSON.stringify(body)

        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            body: payload,
            redirect: 'follow',
        })

        const text = await response.text()
        res.setHeader('Content-Type', 'application/json')
        return res.status(200).send(text)
    } catch (e) {
        console.error('[Upload API Error]', e)
        return res.status(500).json({ ok: false, error: e?.message || 'Upload proxy failed' })
    }
}
