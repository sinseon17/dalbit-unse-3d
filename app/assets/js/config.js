/* ============================================================
   달빛 운세 · config.js
   운영 설정 (여기 값만 바꾸면 앱 전체에 반영됩니다)
   ============================================================ */
window.DALBIT_CONFIG = {
  /* 카카오페이 송금(자율 복채) 링크
     카카오톡 → 페이 → 송금 → QR코드/링크 만들기 로 만든 주소를 넣으세요.
     예) "https://qr.kakaopay.com/AbCdEfGhI"
     비워 두면 복채 모달에 "준비 중" 안내가 표시됩니다. */
  KAKAOPAY_DONATION_URL: "https://qr.kakaopay.com/FGy30hhGA",

  /* 방별 송금 링크(선택). 비워 두면 위 공용 링크를 씁니다.
     방마다 다른 카카오페이 링크를 쓰고 싶을 때만 채우세요. */
  KAKAOPAY_DONATION_URLS: {
    saju: "",        // 사주팔자 방
    tarot: "",       // 타로 방
    dream: "",       // 꿈풀이 방
    naming: "",      // 작명·이름 방
    gungap: "",      // 궁합 방
    meditation: "",  // 기도·명상방
    wish: ""         // 소원등 띄우기
  },

  /* 2026-11-27 개편: 모든 풀이 100% 무료 + 자율 후원 */
  FREE_MODE: true,

  APP_VERSION: "2.0.0",
  SUPPORT_EMAIL: "khj1005k@gmail.com"
};
