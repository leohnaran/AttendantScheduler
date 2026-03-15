import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { viteSingleFile } from "vite-plugin-singlefile"

export default defineConfig({
	base: './',
	plugins: [
		react(),
		viteSingleFile(),
		{
			name: 'html-transform',
			transformIndexHtml(html: string) {
				const timestamp = new Date().toLocaleString();
				const metaTags = `
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
    <meta http-equiv="Pragma" content="no-cache" />
    <meta http-equiv="Expires" content="0" />`;

				return html
					.replace('</head>', `${metaTags}\n  </head>`)
					.replace('<title>Attendant Scheduler v3.6.11</title>', `<title>Attendant Scheduler v3.6.11 (Build: ${timestamp})</title>`);
			},
		},
	],
	test: {
		globals: true,
		environment: 'node',
	},
})
