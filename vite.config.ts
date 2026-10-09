import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'
import viteReact from '@vitejs/plugin-react'

export default defineConfig({
  server: {
    port: 3000,
    // host: true expõe o servidor na rede local, então o celular
    // no mesmo Wi-Fi consegue abrir http://<ip-do-pc>:3000
    host: true,
  },
  plugins: [tanstackStart(), nitro(), viteReact()],
})
