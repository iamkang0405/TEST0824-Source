import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    define: {
      __NAVER_MAP_CLIENT_ID__: JSON.stringify(env.NAVER_MAP_CLIENT_ID || '')
    }
  };
});
