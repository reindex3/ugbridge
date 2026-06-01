import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { ttsPlugin } from './vite-plugins/tts';

export default defineConfig({
  plugins: [react(), tailwindcss(), ttsPlugin()],
});
