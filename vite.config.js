import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    define: {
      // 기존 .env에 실수로 키 이름 뒤 공백이 있어도 읽을 수 있도록 처리합니다.
      __NAVER_MAP_CLIENT_ID__: JSON.stringify(
        env.NAVER_MAP_CLIENT_ID || env['NAVER_MAP_CLIENT_ID '] || ''
      )
    }
  };
});
