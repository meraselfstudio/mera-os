import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '')
    const appsScriptUrl = env.VITE_APPS_SCRIPT_URL || ''

    return {
        plugins: [
            react(),
            {
                name: 'api-upload-proxy',
                configureServer(server) {
                    server.middlewares.use('/api/upload', async (req, res) => {
                        if (req.method !== 'POST') {
                            res.statusCode = 405
                            return res.end('Method not allowed')
                        }

                        let bodyStr = ''
                        req.on('data', chunk => { bodyStr += chunk })
                        req.on('end', async () => {
                            if (!appsScriptUrl) {
                                res.statusCode = 500
                                res.setHeader('Content-Type', 'application/json')
                                return res.end(JSON.stringify({ ok: false, error: 'VITE_APPS_SCRIPT_URL not configured' }))
                            }

                            try {
                                let response = await fetch(appsScriptUrl, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
                                    body: bodyStr,
                                    redirect: 'manual',
                                })

                                let redirects = 0
                                while ((response.status === 301 || response.status === 302 || response.status === 307 || response.status === 308) && redirects < 5) {
                                    const location = response.headers.get('location')
                                    if (!location) break
                                    response = await fetch(location, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
                                        body: bodyStr,
                                        redirect: 'manual',
                                    })
                                    redirects++
                                }

                                const text = await response.text()
                                res.setHeader('Content-Type', 'application/json')
                                res.statusCode = 200
                                res.end(text)
                            } catch (e: any) {
                                res.statusCode = 500
                                res.setHeader('Content-Type', 'application/json')
                                res.end(JSON.stringify({ ok: false, error: e.message }))
                            }
                        })
                    })
                },
            },
        ],
        resolve: {
            alias: {
                '@': '/src',
            },
        },
        server: {
            port: 5173,
            host: true,
        },
        build: {
            outDir: 'dist',
            sourcemap: true,
        },
    }
})
