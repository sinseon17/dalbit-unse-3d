/* ============================================================
   달빛 운세 · saju-qa.js
   사주팔자 전각 — 💬 도사님께 사주 질문방 (엽전 3닢 점)
   · 서버 없이 프론트에서만 동작한다
   · 사주 결과 화면이 그려지면 스스로 붙는다(다른 스크립트를 건드리지 않음)
   · 엽전 3닢을 던져 나온 괘(팔괘) + 일간·오행·십성·대운·세운을 함께 읽어 답한다
   · 마이크로 말해 묻기(Web Speech Recognition) · 답변 소리로 듣기(Web Speech Synthesis)
   ============================================================ */
(function (global) {
  "use strict";

  const LS_APP = "dalbit_fortune_v2";     // app.js 상태(사주 결과 포함)
  const LS_QA = "dalbit_saju_qa_v1";      // 질문방 대화 저장
  const LS_MUTE = "dalbit_bgm_muted";
  const LS_AUTO = "sqa_auto_read";
  const MAX_MSG = 40;
  const MAX_ROOMS = 6;

  const ELEMS = ["木", "火", "土", "金", "水"];
  const ELEM_KR = { 木: "목", 火: "화", 土: "토", 金: "금", 水: "수" };
  const elemKr = (e) => ELEM_KR[e] + "(" + e + ")";
  // 받침 있는 오행(목·금)에 맞춰 조사를 고른다
  const JONG = { 木: 1, 火: 0, 土: 0, 金: 1, 水: 0 };
  const josa = (e, withJong, withoutJong) => (JONG[e] ? withJong : withoutJong);
  const DIR = { 木: "동쪽", 火: "남쪽", 土: "남서쪽", 金: "서쪽", 水: "북쪽" };
  const COLOR = { 木: "연두·청록", 火: "붉은·주황", 土: "노랑·황토", 金: "흰빛·은빛", 水: "남색·검정" };
  const SEASON = { 木: "봄(2~4월)", 火: "초여름(5~6월)", 土: "환절기(3·6·9·12월)", 金: "가을(9~11월)", 水: "겨울(11~1월)" };
  const ORGAN = { 木: "간과 눈, 신경", 火: "심장과 혈압, 수면", 土: "위와 소화", 金: "폐와 호흡기, 피부", 水: "신장과 허리, 방광" };
  const ACT = {
    木: "아침 산책과 새로 배우는 일, 초록 잎을 곁에 두는 것",
    火: "사람을 만나 웃고 말하는 일, 볕을 쬐는 것",
    土: "정한 시간에 밥 먹고 규칙적으로 움직이는 일",
    金: "정리하고 버리는 일, 결정을 미루지 않는 연습",
    水: "물을 자주 마시고 글을 쓰는 일, 잠을 깊게 자는 일"
  };

  /* ---------- 일간(日干) ---------- */
  const STEM = [
    { han: "甲", kr: "갑목", img: "큰 나무", tone: "곧게 뻗어 방향을 세우는" },
    { han: "乙", kr: "을목", img: "덩굴과 풀", tone: "부러지지 않고 휘어 자라는" },
    { han: "丙", kr: "병화", img: "한낮의 해", tone: "숨김없이 밝게 비추는" },
    { han: "丁", kr: "정화", img: "촛불", tone: "작지만 깊이 스며드는" },
    { han: "戊", kr: "무토", img: "큰 산", tone: "묵직하게 자리를 지키는" },
    { han: "己", kr: "기토", img: "기름진 밭", tone: "조용히 키우고 가꾸는" },
    { han: "庚", kr: "경금", img: "벼린 쇠", tone: "결단이 빠르고 밀고 나가는" },
    { han: "辛", kr: "신금", img: "보석", tone: "결점을 남기지 않는" },
    { han: "壬", kr: "임수", img: "큰 바다", tone: "넓게 흐르며 흐름을 읽는" },
    { han: "癸", kr: "계수", img: "이슬비", tone: "조용히 스며들어 살피는" }
  ];

  /* ---------- 팔괘 (엽전 3닢) ----------
     coins[0]=아래(초효), [1]=가운데, [2]=위(삼효) · 1=양(글자 福), 0=음(무늬) */
  const TRIGRAM = {
    7: { sym: "☰", han: "乾", kr: "건", nat: "하늘", gil: "강한 길 · 나아감",
      text: [
        "세 닢이 모두 글자로 서니 乾(건) — 하늘의 괘이외다. 하늘은 스스로 자리를 만들고 쉬지 않으니, 그대가 물은 일은 미루면 흐려지고 나아가면 길이 열리는 자리요.",
        "세 닢이 글자로만 서서 乾(건)괘를 이루었소. 하늘은 굽히지 않는 기운이라, 그대 안에는 이미 마음이 서 있을 것이오. 남은 것은 때가 아니라 첫걸음이외다."
      ],
      close: [
        "乾의 기운을 받았으니 오늘은 물러서지 마시오. 다만 하늘도 혼자 높지 않으니, 한 사람에게라도 말해 두고 가면 그 길이 오래 갑니다.",
        "乾은 시작의 괘이나 끝맺음은 사람의 몫이오. 오늘 딛는 한 걸음을 종이에 적어 두시오. 그 글씨가 나중에 그대를 재촉할 것이오."
      ] },
    6: { sym: "☱", han: "兌", kr: "태", nat: "못", gil: "좋은 길 · 기쁨과 만남",
      text: [
        "아래 두 닢이 글자, 위 한 닢이 무늬 — 兌(태)괘요. 못은 서로 마주해 기뻐하는 자리라, 사람과 말에서 답이 나오는 물음이외다.",
        "세 닢이 兌(태)를 이루었소. 못처럼 고인 물은 서로 비추는 법, 혼자 곱씹기보다 누군가와 나누어야 풀리는 일이오."
      ],
      close: [
        "兌는 기쁨의 괘이나 말이 앞서면 기쁨이 흩어지오. 오늘은 한 번 듣고 한 번 말하시오. 그 사이에 답이 있습니다.",
        "못은 낮은 곳에 고이면서도 마르지 않소. 그대도 서두르지 않으면 오히려 오래 채워질 것이오."
      ] },
    5: { sym: "☲", han: "離", kr: "리", nat: "불", gil: "밝은 길 · 드러남",
      text: [
        "가운데 닢만 무늬요 — 離(리)괘, 불이외다. 불은 밝히는 것이 일이라, 숨겨 둔 것을 드러낼 때 길이 트이는 물음이오.",
        "세 닢이 離(리)를 이루었소. 불은 매달릴 곳이 있어야 타오르니, 그대에게는 의지할 한 가지가 이미 있습니다."
      ],
      close: [
        "離는 밝음의 괘요. 다만 불은 가까이하는 것을 태우니, 사람과의 거리를 한 뼘 두는 지혜가 필요하외다.",
        "등불은 제 몸을 아끼지 않지만 기름이 있어야 밝소. 그대의 기름은 잠과 밥이외다."
      ] },
    4: { sym: "☳", han: "震", kr: "진", nat: "우레", gil: "움직이는 길 · 변화",
      text: [
        "아래 한 닢만 글자 — 震(진)괘, 우레요. 우레는 잠든 것을 깨우는 소리라, 지금은 조용히 견디기보다 크게 움직일 때외다.",
        "세 닢이 震(진)을 이루었소. 천둥은 한 번 치고 곧 지나가오. 놀라 자리를 옮기되, 겁내어 움츠러들지는 마시오."
      ],
      close: [
        "震은 놀람의 괘이나 그 뒤에 반드시 비가 와 땅을 적시오. 오늘의 소란을 두려워 말고 그 뒤의 촉촉함을 기다리시오.",
        "우레는 하늘의 명령을 알리는 소리요. 마음에 오래 미뤄 둔 그 일이 있다면 오늘이 그 소리입니다."
      ] },
    3: { sym: "☴", han: "巽", kr: "손", nat: "바람", gil: "고른 길 · 스며듦",
      text: [
        "위 두 닢이 글자, 아래 한 닢이 무늬 — 巽(손)괘, 바람이외다. 바람은 틈으로 스며들어 결국 다 닿으니, 서두르지 않고 꾸준히 밀어붙이는 방식이 맞소.",
        "세 닢이 巽(손)을 이루었소. 바람은 세게 불기보다 오래 부는 것이 일을 이루오. 그대의 물음에는 시간이 약이외다."
      ],
      close: [
        "巽은 유순하되 뚫는 괘요. 오늘은 세게 말하지 말고 한 번 더 부탁해 보시오. 바람처럼 스며들 것이오.",
        "바람은 방향이 바뀌어도 그치지 않소. 그대도 결론이 늦어져도 멈추지만 않으면 닿을 자리에 닿습니다."
      ] },
    2: { sym: "☵", han: "坎", kr: "감", nat: "물", gil: "주의의 길 · 살핌",
      text: [
        "가운데 닢만 글자 — 坎(감)괘, 물이외다. 물은 낮은 곳으로 흐르며 때를 기다리니, 지금은 나아가기보다 살피고 낮추는 자리요.",
        "세 닢이 坎(감)을 이루었소. 험한 물을 건널 때는 뛰지 않고 한 발씩 디디오. 그대의 물음에도 급함이 가장 큰 적이외다."
      ],
      close: [
        "坎은 험한 물의 괘이나 물을 알면 건널 수 있소. 오늘은 결정을 하루 묵히고, 확인할 것 하나만 더 확인하시오.",
        "물은 막히면 돌아갈 줄 아오. 그대도 물러서는 것이 지는 것이라 여기지 마시오."
      ] },
    1: { sym: "☶", han: "艮", kr: "간", nat: "산", gil: "멈춤의 길 · 지킴",
      text: [
        "위 한 닢만 글자 — 艮(간)괘, 산이외다. 산은 쉽게 움직이지 않으니, 지금은 벌이기보다 지키고 멈출 때요.",
        "세 닢이 艮(간)을 이루었소. 산을 오를 때는 숨을 고르는 자리가 있어야 정상에 서오. 그대에게 필요한 것은 결심이 아니라 휴식이외다."
      ],
      close: [
        "艮은 멈춤의 괘요. 멈추는 것도 하는 일이니, 오늘 하나를 접어 두면 내일 둘이 열리오.",
        "산은 제자리에 있으면서 온갖 것을 내려다보오. 그대도 오늘은 나서지 말고 한 걸음 물러서 보시오."
      ] },
    0: { sym: "☷", han: "坤", kr: "곤", nat: "땅", gil: "너그러운 길 · 쌓임",
      text: [
        "세 닢이 모두 무늬로 누우니 坤(곤) — 땅의 괘이외다. 땅은 받아들이고 품어 모든 것을 기르니, 지금은 밀어붙이기보다 받아들이고 쌓는 자리요.",
        "세 닢이 무늬로만 서서 坤(곤)괘를 이루었소. 땅은 서두르지 않아도 때가 되면 반드시 열매를 내오. 그대의 물음에는 기다림이 곧 재주외다."
      ],
      close: [
        "坤은 어머니의 괘요. 오늘은 누군가를 챙기는 일이 곧 그대의 복이 됩니다. 다만 제 몫의 밥은 거르지 마시오.",
        "땅은 밟혀도 다시 풀을 내오. 그대의 너그러움이 약점처럼 보여도 결국 그것이 재산이 될 것이외다."
      ] }
  };

  /* ---------- 운(運)의 십성 해석 ---------- */
  const SEUN_TEXT = {
    비화: "힘이 겹치는 해라 의욕은 넘치되 경쟁과 소모도 함께 오오",
    식상: "표현과 활동의 문이 열려 만들고 말하고 움직이는 일이 결실을 맺는 해요",
    재성: "재물과 현실의 문이 열려 돈과 사람이 함께 움직이는 해요",
    관성: "책임과 자리의 문이 열려 시험·계약·직장의 일이 앞에 놓이는 해요",
    인성: "배움과 보호의 문이 열려 문서와 자격, 귀인의 손길이 따르는 해요"
  };
  const DAE_TEXT = {
    비화: "내 힘으로 밀어붙이는 흐름",
    식상: "재주를 밖으로 꺼내 세상과 만나는 흐름",
    재성: "현실과 돈을 다루는 감각이 자라는 흐름",
    관성: "자리와 책임이 무거워지는 대신 이름이 서는 흐름",
    인성: "배우고 정리하며 뿌리를 내리는 흐름"
  };
  const DAE_IMG = { 木: "새로 심고 키우는 10년", 火: "드러내고 넓히는 10년", 土: "쌓고 다지는 10년", 金: "정리하고 매듭짓는 10년", 水: "흐르고 배우는 10년" };

  function relate(base, other) {
    const d = (ELEMS.indexOf(other) - ELEMS.indexOf(base) + 5) % 5;
    return ["비화", "식상", "재성", "관성", "인성"][d];
  }

  /* ---------- 오행별 재물 ---------- */
  const MAX_MONEY = {
    木: "목(木)이 강한 사주는 새 일을 벌여 돈의 길을 여는 힘이 크외다. 다만 벌인 일을 매듭짓지 않으면 수입이 겉돌지.",
    火: "화(火)가 강하면 사람과 활동이 곧 돈이 되오. 손님이 많고 말이 잘 통하는 대신, 기분을 따라 나가는 돈이 새는 구멍이외다.",
    土: "토(土)가 강하면 땅과 실물, 오래 쌓는 재물과 인연이 깊소. 급한 승부보다 자산을 쌓는 방식이 그대 몸에 맞소.",
    金: "금(金)이 강하면 벌고 지키는 감각이 좋아 돈이 손에 붙소. 다만 지나치게 아끼면 인연이 마르니 씀씀이의 균형이 관건이오.",
    水: "수(水)가 강하면 흐름을 읽는 눈이 밝아 큰 그림의 재테크에 유리하오. 다만 생각만 길어지면 기회가 물결처럼 지나가오."
  };
  const MIN_MONEY = {
    木: "목(木)이 모자라니 시작하는 결단이 늦소. 새 거래는 마음먹은 날로부터 사흘 안에 첫걸음을 떼야 돈이 붙소.",
    火: "화(火)가 모자라니 알리는 힘이 약하오. 물건이 좋아도 말하지 않으면 팔리지 않으니 하루 한 번은 밖으로 소리 내어 알리시오.",
    土: "토(土)가 모자라니 번 돈이 머물지 않고 흩어지오. 통장 하나를 정해 그곳만 재물 창고로 쓰면 달라지오.",
    金: "금(金)이 모자라니 마무리와 수금이 늦소. 외상은 기한을 적어 두고 정산일을 정해 두시오.",
    水: "수(水)가 모자라니 돈의 흐름을 읽는 눈이 흐리오. 큰돈을 옮기기 전에 장부를 눈으로 한 번 확인하는 습관이 재물을 지키오."
  };

  /* ---------- 오행별 일 ---------- */
  const MAX_CAREER = {
    木: "목(木)이 강하니 조직 안에서도 새 일을 만들어 내는 자리가 맞소. 시키는 일만 하면 답답해지는 사주요.",
    火: "화(火)가 강하니 사람 앞에 서는 일, 알리고 설득하는 일에서 힘이 나오오. 혼자 하는 일은 오래 못 견디오.",
    土: "토(土)가 강하니 맡은 자리를 오래 지키며 신뢰를 쌓는 쪽이 유리하오. 잦은 이동은 그대의 복을 깎소.",
    金: "금(金)이 강하니 기준이 분명한 일, 정확을 다투는 일에서 인정을 받소. 다만 윗사람과 부딪히면 손해가 크오.",
    水: "수(水)가 강하니 정보와 흐름을 다루는 일, 사람을 잇는 일이 잘 맞소. 결정을 미루는 버릇만 고치면 크게 서오."
  };
  const MIN_CAREER = {
    木: "목(木)이 모자라니 새 판을 여는 데 겁이 나오. 작은 개선 하나를 직접 제안해 보시오. 그 한 번이 문을 여오.",
    火: "화(火)가 모자라니 자기 성과를 말하지 못해 남에게 돌아가오. 한 달에 한 번은 한 일을 글로 정리해 위에 보이시오.",
    土: "토(土)가 모자라니 중간에 흔들려 끝을 못 보오. 한 번 시작한 일은 기한을 정해 매듭짓는 습관이 필요하오.",
    金: "금(金)이 모자라니 결단과 마무리가 늦소. 사흘 안에 답을 내는 규칙을 스스로 세우시오.",
    水: "수(水)가 모자라니 사람의 마음을 읽는 데 시간이 걸리오. 말하기 전에 상대의 사정을 한 번 짚어 보시오."
  };

  /* ---------- 오행별 인연 ---------- */
  const MAX_LOVE = {
    木: "목(木)이 강하니 먼저 다가가고 먼저 키우는 사랑을 하오. 다만 상대가 따라오는 속도를 기다려 줄 필요가 있소.",
    火: "화(火)가 강하니 사랑이 뜨겁고 빠르오. 시작이 빠른 만큼 식는 것도 빨라, 불을 낮추는 인내가 오래가는 비결이오.",
    土: "토(土)가 강하니 정이 깊고 한번 들면 쉽게 놓지 않소. 다만 표현이 무뎌 상대가 마음을 못 읽을 수 있소.",
    金: "금(金)이 강하니 상대를 고르는 눈이 까다롭소. 그 기준이 사람을 거르는 벽이 되지 않게 하시오.",
    水: "수(水)가 강하니 마음을 잘 헤아려 상대가 편안해하오. 다만 속에 담아 두어 서운함이 쌓이기 쉬우오."
  };
  const MIN_LOVE = {
    木: "목(木)이 모자라니 관계를 키우는 시간이 부족하오. 좋은 사람을 만나도 자주 보지 않으면 마음이 마르오.",
    火: "화(火)가 모자라니 마음을 표현하는 데 서투오. 좋다 싫다를 말로 해야 상대가 알지, 눈빛만으로는 부족하오.",
    土: "토(土)가 모자라니 관계가 깊어지기 전에 흔들리오. 한 사람과 오래 가는 연습이 곧 그대의 복이오.",
    金: "금(金)이 모자라니 결단이 늦어 인연의 때를 놓치오. 마음이 있으면 오래 재지 말고 말하시오.",
    水: "수(水)가 모자라니 상대의 사정을 헤아리는 데 시간이 걸리오. 짐작하지 말고 물어보는 것이 낫소."
  };

  /* ---------- 오행별 건강 ---------- */
  const MIN_HEALTH = {
    木: "목(木)이 모자라니 간과 눈, 신경이 먼저 지치오. 늦은 밤과 화면을 줄이고 목을 길게 늘이는 스트레칭이 약이외다.",
    火: "화(火)가 모자라니 심장과 혈압이 무기력해지기 쉬우오. 아침 햇볕과 가벼운 걷기가 기운을 올리오.",
    土: "토(土)가 모자라니 위와 소화가 약하오. 정해진 시간의 식사와 천천히 씹는 일이 보약이외다.",
    金: "금(金)이 모자라니 폐와 호흡기, 피부가 예민하오. 환기와 물, 그리고 담배를 멀리하는 것이 먼저요.",
    水: "수(水)가 모자라니 신장과 허리가 약하오. 허리를 따뜻하게 하고 오래 앉아 있지 마시오."
  };
  const MAX_HEALTH = {
    木: "목(木)이 강해 기운은 좋으나 풀지 못한 채 쌓이면 신경이 곤두서오. 몸을 크게 쓰는 운동으로 흘려보내시오.",
    火: "화(火)가 강해 열이 위로 뜨오. 늦은 밤 카페인과 매운 음식이 잠을 망치니 저녁 뒤에는 불을 낮추시오.",
    土: "토(土)가 강해 잘 붙고 잘 처지오. 저녁 식사를 가볍게 하고 몸을 자주 움직여야 무거워지지 않소.",
    金: "금(金)이 강해 예민하고 긴장이 잦으오. 어깨와 목을 풀고 잠들기 전 숨을 길게 내쉬는 연습이 필요하오.",
    水: "수(水)가 강해 생각이 많아 잠이 얕으오. 자기 전 걱정을 종이에 내려놓는 일이 잠의 문을 닫아 주오."
  };

  /* ---------- 오행별 집·문서 ---------- */
  const MAX_MOVE = {
    木: "목(木)이 강하니 집을 옮기고 새로 시작하는 일에 두려움이 없소. 다만 옮긴 뒤 정착하는 시간을 넉넉히 두시오.",
    火: "화(火)가 강하니 집안 분위기와 채광이 그대의 운을 좌우하오. 볕이 드는 집이 맞소.",
    土: "토(土)가 강하니 땅과 집이 재산이 되는 사주요. 급히 사고파는 것보다 오래 두는 쪽이 이롭소.",
    金: "금(金)이 강하니 계약서와 조건을 꼼꼼히 보는 눈이 좋소. 그 눈을 믿되 사람을 의심하는 데까지 가면 인연이 상하오.",
    水: "수(水)가 강하니 물가나 흐름이 좋은 자리와 인연이 있소. 다만 조건을 재느라 때를 놓치지 마시오."
  };
  const MIN_MOVE = {
    木: "목(木)이 모자라니 새 집에 들이는 결정이 늦소. 마음에 든 곳이 있으면 한 번 더 보되 사흘 안에 답을 내시오.",
    火: "화(火)가 모자라니 집안이 어두워지기 쉬우오. 조명을 밝게 하고 볕이 드는 자리에 몸을 두시오.",
    土: "토(土)가 모자라니 집이 마음의 중심이 되지 못하오. 정해진 자리에서 밥을 먹고 잠을 자는 규칙이 집을 집답게 만드오.",
    金: "금(金)이 모자라니 문서의 세부를 놓치오. 도장을 찍기 전 하루 묵히고, 특약 한 줄을 더 확인하시오.",
    水: "수(水)가 모자라니 이사 뒤 물길과 교통을 살피는 데 소홀하오. 계약 전에 물과 길을 직접 확인하시오."
  };

  function pick(arr, r) { return arr[Math.floor(r() * arr.length) % arr.length]; }
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    let s = seed >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  /* ============================================================
     질문 분류
     ============================================================ */
  const CATS = {
    money: {
      kw: ["재물", "재산", "돈", "투자", "사업", "수입", "벌이", "재테크", "주식", "코인", "창업", "장사", "판매", "매출", "부업", "월급", "저축", "대출", "빚", "목돈", "자금", "수익", "돈벌", "돈이", "돈은", "돈을"],
      open: [
        "돈 이야기를 꺼내는 이는 마음이 무거울 때가 많지. 잘 물었소. 재물은 그대 사주에서 어디로 흐르고 어디서 새는지부터 보아야 하오.",
        "재물운은 하늘에서 떨어지지 않고 사주의 통로로 흐르는 법이오. 그대 8자를 다시 펴서 재물의 길을 짚어 보겠소.",
        "돈은 벌리는 재주보다 지키는 그릇이 먼저라 하였소. 그대의 그릇이 얼마나 크고 어디가 얇은지 보아 드리겠소."
      ],
      basis(c) {
        const g = c.gods, out = [];
        if (g.재성 === 0) out.push("그대 사주엔 재성(財星)이 드러나 있지 않소. 이는 돈이 없는 사주가 아니라, 돈이 저절로 굴러오기보다 손으로 만들어야 하는 사주요.");
        else if (g.재성 === 1) out.push("그대 사주에는 재성(財星)이 하나 서 있어 돈을 향한 감각이 살아 있소. 다만 하나뿐이라 한길로 모아야 힘을 쓰지, 여럿에 나누면 물이 얕아지오.");
        else out.push("그대 사주엔 재성(財星)이 " + g.재성 + "개나 서 있소. 돈이 드나드는 폭이 큰 사주라 벌이는 일도 많고 씀씀이도 크오. 넓게 벌되 창고는 좁게 지켜야 하오.");
        if (g.식상 > 0) out.push("재물의 통로가 되는 식상(食傷)이 " + g.식상 + "개 있어, 그대 재주와 말이 곧 돈이 되는 구조요. 잘하는 것을 상품으로 만들면 재물이 따라오오.");
        else out.push("다만 식상(食傷)이 비어 있어 재주를 밖으로 꺼내는 데 서투오. 잘하는 일을 한 문장으로 정리해 두면 그 자리에서 돈이 생기오.");
        out.push(MAX_MONEY[c.max]);
        out.push(MIN_MONEY[c.min]);
        return out;
      },
      advice(c) {
        return [
          "그러니 재물은 " + DIR[c.min] + " — " + elemKr(c.min) + "의 기운을 빌어야 하오. 큰 결정은 " + SEASON[c.min] + "에 정리하고, 그때를 위해 지금부터 장부를 한 권 만들어 두시오. 들어온 돈과 나간 돈을 같은 줄에 적는 것만으로도 새는 구멍이 눈에 보이오.",
          "잃는 것부터 막는 것이 번다음이오. 보증·외상·급한 투자는 그대 사주의 약한 고리를 정면으로 치는 일이니, 권하는 사람이 있어도 하루 묵혀 결정하시오. 그리고 " + ACT[c.min] + " — 이것이 돈을 부르는 그대만의 부적이외다."
        ];
      }
    },

    career: {
      kw: ["직장", "이직", "회사", "시험", "승진", "취업", "면접", "퇴사", "상사", "동료", "업무", "자격증", "공무원", "진급", "일자리", "커리어", "직업", "입사", "전직", "사업장", "공부", "합격"],
      open: [
        "일 이야기를 물었으니, 그대가 어느 자리에서 힘을 내고 어디서 숨이 차는지부터 살펴보겠소.",
        "직장과 이직은 사주의 관(官)과 식상(食傷)을 함께 보는 법이오. 8자를 펴 보겠소.",
        "그대가 지금 서 있는 자리가 사주에 맞는 자리인지, 옮겨야 할 자리인지 — 둘 다 8자에 적혀 있소."
      ],
      basis(c) {
        const g = c.gods, out = [];
        if (g.관성 === 0) out.push("그대 사주엔 관성(官星)이 비어 있소. 정해진 자리에 몸을 맞추기보다 스스로 판을 만드는 쪽이 그대에게는 맞소. 조직에 있다면 이름보다 실력을 쌓으시오.");
        else out.push("그대 사주엔 관성(官星)이 " + g.관성 + "개 있어 자리와 책임의 인연이 있소. 맡은 자리를 지키는 힘이 곧 그대의 이름이 되오.");
        out.push(c.strong === "신강"
          ? "일간의 힘이 강한 사주라 밀고 나가는 힘은 좋으나, 윗사람과 부딪히면 손해가 크오. 맞서기보다 결과로 말하시오."
          : c.strong === "신약"
            ? "일간의 힘이 부드러운 사주라 협력과 배움으로 키워야 하는 자리요. 무리한 확장보다 한 사람의 든든한 후원을 만드는 것이 급하오."
            : "오행이 고르게 잡혀 있어 어느 자리에서든 무리 없이 적응하오. 대신 스스로 한 우물을 정하지 않으면 자리가 흐려지오.");
        out.push(MAX_CAREER[c.max]);
        out.push(MIN_CAREER[c.min]);
        return out;
      },
      advice(c) {
        return [
          "옮길 때와 머물 때가 따로 있소. 옮기는 문은 " + SEASON[c.min] + "에 열리니, 그때를 목표로 지금은 실적을 정리해 두시오. 이력서와 포트폴리오는 결정이 선 뒤에 만들면 늦소.",
          "시험이나 자격은 인성(印星)의 문이라, " + (c.gods.인성 > 0 ? "그대 사주엔 배움의 별이 있어 앉아서 파고들면 반드시 남는 공부요." : "그대 사주엔 배움의 별이 적으니 혼자 파기보다 스터디나 강의처럼 사람과 함께하는 방식이 효과가 크오.") + " 하루 한 시간을 같은 시각에 지키는 것이 비결이외다."
        ];
      }
    },

    love: {
      kw: ["연애", "결혼", "인연", "배우자", "애정", "썸", "이별", "재회", "남자", "여자", "궁합", "남편", "아내", "사랑", "혼인", "소개팅", "짝", "애인", "커플"],
      open: [
        "인연은 사주에서 배우자궁과 그 별을 함께 보는 법이외다. 그대 일지부터 짚어 보겠소.",
        "사랑은 마음이 먼저지만 그 마음이 머무는 자리는 8자에 적혀 있소. 천천히 보아 드리겠소.",
        "누구를 만나고 어떻게 오래 가는지 — 그 답은 그대 사주의 일지(배우자궁)에 앉아 있소."
      ],
      basis(c) {
        const out = [];
        const star = c.gender === "male" ? "재성" : "관성";
        const starKr = c.gender === "male" ? "재성(財星)" : "관성(官星)";
        const n = c.gods[star];
        if (n === 0) out.push((c.gender === "male" ? "남성 사주에서 아내는 재성" : "여성 사주에서 배우자는 관성") + "으로 보는데, 그대 사주엔 " + starKr + "이 드러나 있지 않소. 인연이 늦게 오는 대신 한 번 오면 깊소. 서둘러 고르면 오히려 멀어지오.");
        else out.push((c.gender === "male" ? "남성 사주에서 아내는 재성" : "여성 사주에서 배우자는 관성") + "으로 보는데, 그대 사주엔 " + starKr + "이 " + n + "개 있소. " + (n > 1 ? "인연의 문이 여럿이라 고르는 눈이 필요하오. 한 사람을 정하면 흔들리지 않는 것이 복이외다." : "인연의 별이 하나라 그 별을 오래 키우는 쪽이 맞소."));
        out.push("배우자궁인 일지가 " + elemKr(c.dayBranchElem) + josa(c.dayBranchElem, "이라", "라") + ", 그 자리는 " + c.dayBranchRelation + "의 자리요. " + c.dayBranchText);
        out.push(MAX_LOVE[c.max]);
        out.push(MIN_LOVE[c.min]);
        return out;
      },
      advice(c) {
        return [
          "인연은 문을 두드리는 자리에 옵니다. " + SEASON[c.min] + " 무렵, 사람이 모이는 자리에서 " + DIR[c.min] + " 방향을 등지고 앉지 마시오. 소개든 모임이든 발을 들여놓는 것만으로 그대 사주엔 인연의 씨가 떨어지오.",
          "그리고 한 가지 — 마음이 있어도 재지 마시오. 그대는 " + (c.strong === "신약" ? "마음이 부드러워 상대의 눈치를 오래 보는 편이니, 좋으면 좋다고 말하는 그 한마디가 인연을 붙드오." : "결심이 서면 빠른 편이나, 상대의 속도를 기다려 주어야 오래 가오.") + " 사랑은 속도보다 방향이오."
        ];
      }
    },

    health: {
      kw: ["건강", "컨디션", "아프", "병원", "수술", "다이어트", "잠", "피로", "우울", "스트레스", "몸", "소화", "두통", "불면", "체력", "아픈", "기운"],
      open: [
        "몸은 사주가 가장 먼저 말해 주는 것이오. 어느 기운이 넘치고 어느 기운이 모자란지부터 보겠소.",
        "건강은 8자에서 약한 고리 하나를 찾는 일이오. 그 고리를 알면 병보다 먼저 손쓸 수 있소.",
        "아픈 데를 묻기 전에 그대 사주가 어디가 얇은지 보아야 하오. 잠깐 8자를 펴 보겠소."
      ],
      basis(c) {
        const out = [];
        out.push(MIN_HEALTH[c.min]);
        out.push(MAX_HEALTH[c.max]);
        out.push(c.strong === "신강"
          ? "기운이 강한 사주라 아프기보다 버티다 쓰러지는 편이오. 쉬는 것을 게을리하면 몸이 크게 청구하니, 조금 피곤할 때 미리 쉬는 것이 가장 값싼 약이외다."
          : c.strong === "신약"
            ? "기운이 부드러운 사주라 크게 앓기보다 오래 지치는 편이오. 무리한 운동보다 잠과 밥을 규칙으로 지키는 것이 먼저요."
            : "기운이 고르게 잡혀 있어 큰 병보다 생활의 흐트러짐에서 오는 잔병이 문제요. 하루의 리듬을 지키는 것이 곧 보약이외다.");
        return out;
      },
      advice(c) {
        return [
          "지금 할 일은 셋이오. 첫째, " + SEASON[c.min] + "에는 특히 " + ORGAN[c.min] + "을 살피시오. 둘째, " + ACT[c.min] + ". 셋째, 잠들기 전 한 시간은 화면을 손에서 내려놓으시오.",
          "물 한 잔과 열 걸음 — 이것만 매일 같은 시각에 지키면 석 달 뒤 컨디션이 달라지오. 병이 커진 뒤에 묻는 것보다, 지금 자리에서 몸에 한 번 물어보는 것이 값진 물음이외다."
        ];
      }
    },

    move: {
      kw: ["이사", "이전", "부동산", "계약", "전세", "월세", "매매", "청약", "문서", "등기", "집", "집값", "매물", "이주", "사무실", "상가", "증여"],
      open: [
        "집과 문서는 사주에서 인성(印星)과 토(土)의 기운을 함께 보오. 옮길 때와 머물 때가 따로 있지.",
        "이사와 계약은 사람의 운에서 큰 매듭이오. 그대 사주가 어느 쪽으로 열려 있는지 보아 드리겠소.",
        "문서에 도장을 찍는 일은 그 사람의 운을 옮기는 일이외다. 8자를 펴 보고 판단하시오."
      ],
      basis(c) {
        const out = [];
        const in_ = c.gods.인성, to = c.counts["土"] || 0;
        if (in_ === 0) out.push("그대 사주엔 인성(印星)이 비어 있어 문서의 인연이 얇소. 계약서를 대충 넘기면 뒤에 탈이 나니, 이 일만은 남에게 맡기지 말고 직접 읽으시오.");
        else out.push("그대 사주엔 인성(印星)이 " + in_ + "개 있어 문서와 계약의 인연이 있소. 집과 서류에서 도움을 받는 사주요.");
        out.push(to === 0 ? "토(土)의 기운이 아예 없으니 땅을 사고파는 일은 신중해야 하오. 부동산은 그대에게 약한 고리요." :
          to >= 3 ? "토(土)의 기운이 " + to + "개로 두터우니 땅과 집이 그대 재산의 뿌리가 되오. 급히 팔지 말고 오래 두는 쪽이 이롭소."
            : "토(土)의 기운이 " + to + "개로 무난하니 집은 한 채씩 실하게 옮기는 방식이 맞소.");
        out.push(MAX_MOVE[c.max]);
        out.push(MIN_MOVE[c.min]);
        return out;
      },
      advice(c) {
        return [
          "옮길 문은 " + SEASON[c.min] + ", " + DIR[c.min] + " 방향이 그대에게 열린 쪽이외다. 이사 자리를 고를 때는 볕과 물길을 먼저 보시오. 서류는 도장을 찍기 전 하루 묵혀 두고, 특약 한 줄을 더 넣으시오.",
          "계약은 사람을 믿고 하는 것이 아니라 조건을 믿고 하는 것이오. 상대가 좋은 사람일수록 조건을 서로 분명히 해 두면 그 인연이 오래갑니다."
        ];
      }
    },

    family: {
      kw: ["가족", "자녀", "아이", "자식", "부모", "아들", "딸", "형제", "자매", "며느리", "시댁", "어머님", "아버님", "어머니", "아버지", "동생", "언니", "오빠", "누나", "가정"],
      open: [
        "가족은 사주의 년주(뿌리)와 시주(열매)에 담겨 있소. 그대의 자리부터 보겠소.",
        "집안의 일은 8자에 이미 다 적혀 있소. 누구와 어디서 부딪히고 어디서 힘을 받는지 보아 드리겠소.",
        "가족을 묻는 마음은 대개 걱정이오. 그 걱정이 어디서 오는지 사주로 짚어 보겠소."
      ],
      basis(c) {
        const out = [];
        out.push("년주(年柱)가 " + elemKr(c.yearBranchElem) + josa(c.yearBranchElem, "이라", "라") + " " + YEAR_BRANCH_TEXT[c.yearBranchElem] + "이오. 그대가 물려받은 성품의 바탕이지.");
        if (c.hourElem) out.push("시주(時柱)가 " + elemKr(c.hourElem) + josa(c.hourElem, "이라", "라") + " 열매의 자리는 " + HOUR_BRANCH_TEXT[c.hourElem] + "요.");
        else out.push("태어난 시간을 몰라 시주가 비어 있으니 자녀궁은 반쯤 열린 문이외다. 그래도 일지와 월지로 보면 그대는 곁의 사람을 오래 챙기는 자리에 있소.");
        out.push("월지(月支) " + elemKr(c.monthBranchElem) + josa(c.monthBranchElem, "은", "는") + " " + MONTH_BRANCH_TEXT[c.monthBranchElem] + "요. 그 자리가 곧 그대의 사회생활이외다.");
        return out;
      },
      advice(c) {
        return [
          "가족에게는 결론보다 안부가 먼저요. " + SEASON[c.min] + " 무렵, 오래 못 본 사람에게 먼저 연락해 보시오. 그대가 먼저 손을 내밀면 그 자리에서 오해가 풀리오.",
          "자녀나 아랫사람에게는 " + (c.strong === "신강" ? "기대가 커서 말이 앞서기 쉬우니, 시키는 말보다 묻는 말을 먼저 하시오." : "걱정이 앞서 말이 늦으니, 마음에 있는 것을 그대로 꺼내 놓으시오. 그 편이 서로 편안하오.") + " 그대 사주의 복은 결국 사람에게서 오오."
        ];
      }
    },

    year: {
      kw: ["올해", "방향", "운세", "신년", "한해", "한 해", "좋은 때", "시기", "어디로", "언제", "소원", "바람", "이루어", "이뤄"],
      open: [
        "올해의 길을 묻는구려. 세운(歲運)과 대운(大運)이 어디로 흐르는지 펴 보겠소.",
        "한 해의 방향은 크게 보아야 보이오. 하루의 길흉이 아니라 열두 달의 물길을 보아 드리겠소.",
        "어디로 가야 하는지 묻는다면, 먼저 어느 기운이 그대에게 모자란지 알아야 하오. 그것이 나침반이외다."
      ],
      basis(c) {
        const out = [];
        const sy = c.seun;
        if (sy) out.push("올해 " + sy.year + "년은 " + sy.han + "년 — " + elemKr(sy.elem) + "의 해라, " + SEUN_TEXT[sy.rel] + ". " + (sy.rel === "관성" ? "무거운 자리가 오는 대신 그 자리에서 이름이 서오." : sy.rel === "재성" ? "돈이 움직이는 해라 씀씀이와 수입을 함께 적어 두시오." : sy.rel === "인성" ? "문서와 배움, 사람의 도움이 따르는 해요." : sy.rel === "식상" ? "만들고 알리는 일이 잘 풀리는 해요." : "의욕이 앞서는 해라 몸을 아껴 쓰시오."));
        out.push("그대에게 모자란 기운은 " + elemKr(c.min) + josa(c.min, "이니", "니") + ", 올해의 나침반은 " + DIR[c.min] + " — " + elemKr(c.min) + "의 기운이오. 색은 " + COLOR[c.min] + ", 때는 " + SEASON[c.min] + "이 그대에게 열린 창이외다.");
        if (c.dw) out.push("게다가 지금은 " + elemKr(c.dw.elem) + " 대운의 " + DAE_IMG[c.dw.elem] + " 한가운데라, " + DAE_TEXT[c.dw.rel] + "이 열 살의 바탕을 이루고 있소.");
        else out.push("아직 첫 대운에 들기 전이라 바탕을 다지는 시기요. 지금 심는 씨가 열 살 뒤에 그대의 자리가 되오.");
        return out;
      },
      advice(c) {
        return [
          "올해는 이렇게 쓰시오. 큰 결정은 " + SEASON[c.min] + "에 모으고, " + DIR[c.min] + " 방향으로 나가는 길과 자리를 늘리시오. " + ACT[c.min] + " — 이 세 가지가 올해의 부적이외다.",
          "좋은 달을 하나만 꼽자면 " + SEASON[c.min] + "이오. 그때를 위해 지금 두 달은 재고 정리하고 사람을 정리하시오. 비우는 만큼 그 창이 크게 열립니다."
        ];
      }
    },

    general: {
      kw: [],
      open: [
        "꺼내기 어려운 고민일수록 8자에 답의 실마리가 있소. 그대 사주를 천천히 다시 보겠소.",
        "그 물음을 안고 얼마나 오래 오셨는지 모르겠으나, 사주는 늘 같은 자리에서 같은 말을 하오. 함께 읽어 보겠소.",
        "묻는 것이 분명하지 않아도 괜찮소. 지금 그대가 선 자리부터 짚어 드리겠소."
      ],
      basis(c) {
        const s = c.stem;
        const out = [];
        out.push("그대 일간은 " + s.han + "(" + s.kr + ") — " + s.img + "의 기운으로 " + s.tone + " 사람이오. 겉으로 보이는 모습보다 속의 결심이 단단한 쪽이외다.");
        out.push(c.strong === "신강" ? "기운이 강한 사주라 스스로 결정하고 밀고 나가는 힘이 있소. 다만 혼자 짊어지려는 버릇이 병이 되니, 나눠 들 사람을 곁에 두시오."
          : c.strong === "신약" ? "기운이 부드러운 사주라 사람과 배움을 통해 힘을 키우는 방식이 맞소. 무리한 확장보다 기반을 다지면 반드시 서오."
            : "기운이 고르게 잡힌 사주라 어느 한쪽으로 치우치지 않소. 큰 파도 없이 꾸준히 쌓는 힘이 그대의 무기요.");
        out.push("오행을 보면 " + elemKr(c.max) + josa(c.max, "이", "가") + " 가장 많고 " + elemKr(c.min) + josa(c.min, "이", "가") + " 가장 적소. 넘치는 기운은 쓰임으로 흘려보내고, 모자란 기운은 생활로 채우시오.");
        return out;
      },
      advice(c) {
        return [
          "지금 그대에게 필요한 것은 결론이 아니라 순서요. 오늘은 " + ACT[c.min] + " — 이것 하나만 하시오. 몸이 먼저 움직이면 마음의 매듭이 저절로 풀리는 사주요.",
          "결정을 앞두고 있다면 " + SEASON[c.min] + "까지 기다려 보시오. 그 사이에 사람 하나를 만나 물어보고, 종이에 두 갈래로 적어 보시오. 그대 사주는 적을 때 답이 보이는 사주외다."
        ];
      }
    }
  };

  const YEAR_BRANCH_TEXT = {
    木: "곧게 자라려는 기운", 火: "밝게 드러내는 기운", 土: "품어 안정시키는 기운", 金: "결단하고 정리하는 기운", 水: "흐르며 살피는 기운"
  };
  const MONTH_BRANCH_TEXT = {
    木: "형제·동료와 함께 자라는 자리", 火: "사람 앞에 서는 자리", 土: "중간에서 조율하는 자리", 金: "기준을 세우는 자리", 水: "정보와 흐름을 잇는 자리"
  };
  const HOUR_BRANCH_TEXT = {
    木: "자녀와 아랫사람이 곧게 자라는 자리", 火: "자녀가 밝게 드러나는 자리", 土: "자녀가 든든히 자리 잡는 자리", 金: "자녀가 결단 있는 사람으로 크는 자리", 水: "자녀가 지혜로운 사람으로 크는 자리"
  };

  function categorize(q) {
    const s = String(q || "").toLowerCase();
    let best = "general", bestScore = 0;
    Object.keys(CATS).forEach((key) => {
      let score = 0;
      CATS[key].kw.forEach((k) => { if (s.indexOf(k) >= 0) score += k.length; });
      if (key === "year") score *= 0.5;
      if (score > bestScore) { bestScore = score; best = key; }
    });
    return bestScore > 0 ? best : "general";
  }

  /* ============================================================
     사주 읽기
     ============================================================ */
  // 지지 인덱스(子0 … 亥11) → 오행
  const BRANCH_ELEM = ["水", "土", "木", "木", "土", "火", "火", "土", "金", "金", "土", "水"];
  const STEM_ELEM = { 0: "木", 1: "木", 2: "火", 3: "火", 4: "土", 5: "土", 6: "金", 7: "金", 8: "水", 9: "水" };

  function ageOf(solar) {
    const t = new Date();
    let a = t.getFullYear() - solar.y;
    if (t.getMonth() + 1 < solar.m || (t.getMonth() + 1 === solar.m && t.getDate() < solar.d)) a--;
    return Math.max(0, a);
  }

  const DAY_BRANCH_TEXT = {
    비화: "배우자 자리에 그대와 같은 기운이 앉아 있어, 친구처럼 편한 인연이 잘 맞소. 다만 서로의 영역을 존중해야 오래가오.",
    식상: "배우자 자리에 그대가 챙겨 주는 기운이 앉아 있어, 그대가 먼저 베푸는 관계가 되오. 베푼 만큼 돌아오지 않아도 서운해 마시오.",
    재성: "배우자 자리에 현실을 함께 꾸리는 기운이 앉아 있어, 살림과 돈을 함께 다루는 인연이 맞소.",
    관성: "배우자 자리에 나를 다스리는 기운이 앉아 있어, 든든하지만 때로 버거운 인연이 오오. 말로 다스리려 들면 멀어지오.",
    인성: "배우자 자리에 나를 감싸는 기운이 앉아 있어, 보호받고 보호하는 관계를 원하오. 안부를 자주 나누는 것이 무기요."
  };

  function buildCtx(s) {
    const counts = s.counts || {};
    const sorted = ELEMS.slice().sort((a, b) => (counts[b] || 0) - (counts[a] || 0));
    const gods = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
    (s.tenGods || []).forEach((gname, i) => {
      if (i === 2) return; // 일간 자신은 제외
      if (gname === "비견" || gname === "겁재") gods.비겁++;
      else if (gname === "식신" || gname === "상관") gods.식상++;
      else if (gname === "편재" || gname === "정재") gods.재성++;
      else if (gname === "편관" || gname === "정관") gods.관성++;
      else if (gname === "편인" || gname === "정인") gods.인성++;
    });
    const dm = s.dayMaster;
    const dayBranchElem = s.pillars.day ? BRANCH_ELEM[s.pillars.day.b] : "土";
    const dbr = relate(dm.elem, dayBranchElem);
    const yearBranchElem = s.pillars.year ? BRANCH_ELEM[s.pillars.year.b] : dm.elem;
    const monthBranchElem = s.pillars.month ? BRANCH_ELEM[s.pillars.month.b] : dm.elem;
    const hourElem = s.pillars.hour ? BRANCH_ELEM[s.pillars.hour.b] : null;
    const age = ageOf(s.solar);
    const dwn = (s.daewoon || []).filter((d) => age >= d.startAge && age < d.startAge + 10)[0] || null;
    const seun = s.seun || null;
    const seunElem = seun ? STEM_ELEM[seun.stem] : null;

    return {
      key: [s.solar.y, s.solar.m, s.solar.d, s.unknownTime ? "x" : (s.pillars.hour ? s.pillars.hour.s + "-" + s.pillars.hour.b : "x"), s.pillars.day.s, s.pillars.day.b, s.gender, s.name || ""].join("_"),
      name: s.name || "",
      gender: s.gender || "female",
      solar: s.solar,
      unknownTime: !!s.unknownTime,
      stem: STEM[s.dayMaster.stem],
      dm: s.dayMaster,
      counts: counts,
      max: sorted[0],
      min: sorted[4],
      strong: s.strength,
      gods: gods,
      dayBranchElem: dayBranchElem,
      dayBranchRelation: dbr,
      dayBranchText: DAY_BRANCH_TEXT[dbr],
      yearBranchElem: yearBranchElem,
      monthBranchElem: monthBranchElem,
      hourElem: hourElem,
      age: age,
      dw: dwn ? { elem: dwn.elem, rel: relate(dm.elem, dwn.elem), startAge: dwn.startAge } : null,
      seun: seunElem ? { year: seun.year, elem: seunElem, rel: relate(dm.elem, seunElem), han: ((global.DalbitEngine && global.DalbitEngine.CHEONGAN[seun.stem]) || "") + ((global.DalbitEngine && global.DalbitEngine.GANJI[seun.branch]) || "") } : null
    };
  }

  /* ---------- 답변 조립 ---------- */
  function luckParagraph(c) {
    const parts = [];
    if (c.seun) parts.push("그리고 올해 " + c.seun.year + "년은 " + c.seun.han + "년 — " + elemKr(c.seun.elem) + "의 기운이라 " + SEUN_TEXT[c.seun.rel] + ".");
    if (c.dw) parts.push("게다가 지금은 " + elemKr(c.dw.elem) + " 대운의 " + DAE_IMG[c.dw.elem] + "을 지나고 있으니, " + DAE_TEXT[c.dw.rel] + "이 그대의 바탕이오.");
    else parts.push("아직 첫 대운에 들기 전이라 바탕을 다지는 시기요. 지금 심는 씨가 훗날 그대의 자리가 되오.");
    return parts.join(" ");
  }

  function compose(c, q, hex, turn) {
    const r = rng(hash(c.key + "|" + q + "|" + hex.han + "|" + turn));
    const cat = categorize(q);
    const bank = CATS[cat];
    const paras = [];
    paras.push(pick(bank.open, r));
    paras.push(pick(hex.text, r));
    const basis = bank.basis(c, r);
    basis.slice(0, 2).forEach((x) => paras.push(x));
    if (basis.length > 2) paras.push(basis.slice(2).join(" "));
    if (cat !== "year") paras.push(luckParagraph(c));
    paras.push(bank.advice(c, r).join(" "));
    paras.push(pick(hex.close, r));
    return paras;
  }

  /* ============================================================
     엽전
     ============================================================ */
  const bit = () => (Math.random() < 0.5 ? 1 : 0);
  function toss() {
    const coins = [bit(), bit(), bit()];
    const idx = (coins[0] << 2) | (coins[1] << 1) | coins[2];
    return { coins: coins, hex: TRIGRAM[idx] };
  }

  function coinHTML(b, i, animate) {
    const spin = b ? 1800 : 1980;
    return '<div class="sqa-coin' + (animate ? " spin" : "") + '" style="--spin:' + spin + 'deg;--delay:' + (i * 0.07) + 's">' +
      '<div class="cf front">福</div>' +
      '<div class="cf back"><i></i></div>' +
      "</div>";
  }
  function miniCoin(b) {
    return '<span class="sqa-mini ' + (b ? "yang" : "yin") + '">' + (b ? "福" : "<i></i>") + "</span>";
  }

  function coinSound() {
    try {
      if (localStorage.getItem(LS_MUTE) === "1") return;
      const S = global.DalbitSound || global.DalbitVillage;
      if (!S || !S.tone) return;
      [700, 800, 890].forEach((ms, i) => {
        setTimeout(() => { try { S.tone(1180 + i * 190, 0.06, 0.04, "square"); } catch (e) { } }, ms);
      });
    } catch (e) { }
  }

  /* ============================================================
     소리로 읽기 (Web Speech Synthesis)
     ============================================================ */
  const speechOK = () => typeof global.speechSynthesis !== "undefined" && typeof global.SpeechSynthesisUtterance !== "undefined";
  let voiceKo = null;
  let speaking = null;      // { kind:'qa'|'screen'|'sheet', idx }
  let autoRead = true;

  try { autoRead = localStorage.getItem(LS_AUTO) !== "0"; } catch (e) { }

  function pickVoice() {
    if (!speechOK()) return null;
    const vs = global.speechSynthesis.getVoices() || [];
    voiceKo = vs.filter((v) => /^ko(\b|-|_)/i.test(v.lang) || /korean/i.test(v.name))[0] || null;
    return voiceKo;
  }
  if (speechOK()) {
    pickVoice();
    global.speechSynthesis.onvoiceschanged = pickVoice;
  }

  function readable(s) {
    return String(s || "")
      .replace(/([一-龥]+)\(([가-힣]+)\)/g, "$2")
      .replace(/([가-힣]+)\(([一-龥]+)\)/g, "$1")
      .replace(/四柱八字/g, "사주팔자").replace(/宮合/g, "궁합")
      .replace(/作名/g, "작명").replace(/姓名學/g, "성명학").replace(/解夢/g, "해몽")
      .replace(/[\u3400-\u4DBF\u4E00-\u9FFF]+/g, " ")
      .replace(/[☰☱☲☳☴☵☶☷☯]/g, " ")
      .replace(/[\u{1F000}-\u{1FAFF}\u{2190}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu, " ")
      .replace(/[·•—–ㅡ]/g, " ")
      .replace(/[“”"]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function stopSpeak() {
    if (!speechOK()) return;
    try { global.speechSynthesis.cancel(); } catch (e) { }
    speaking = null;
    syncSpeechUI();
  }

  function speak(text, kind, idx) {
    if (!speechOK()) { note("이 브라우저에서는 소리 읽기를 지원하지 않소. 글로 읽어 주시오."); return; }
    const body = readable(text);
    if (!body) return;
    stopSpeak();
    try {
      const u = new global.SpeechSynthesisUtterance(body);
      u.lang = "ko-KR";
      u.rate = 0.97;
      u.pitch = 0.95;
      if (pickVoice()) u.voice = voiceKo;
      u.onend = () => { if (speaking && speaking.kind === kind && speaking.idx === idx) { speaking = null; syncSpeechUI(); } };
      u.onerror = () => { if (speaking && speaking.kind === kind) { speaking = null; syncSpeechUI(); } };
      speaking = { kind: kind, idx: idx };
      global.speechSynthesis.speak(u);
    } catch (e) { speaking = null; }
    syncSpeechUI();
  }

  function toggleSpeak(text, kind, idx) {
    if (speaking && speaking.kind === kind && speaking.idx === idx) stopSpeak();
    else speak(text, kind, idx);
  }

  /* ---------- 화면의 풀이 결과 읽기 ---------- */
  const READ_SKIP = "#sqaCard, .sqa-card, .sqa-form, .sqa-chips, .sqa-log, .sqa-read-fab, .sqa-sheet-read, button, input, textarea, select, .disclaimer, .sqa-fine, script, style, nav, .dock, .hud-bottom";
  function collectText(root, max) {
    if (!root) return "";
    const out = [];
    let len = 0;
    const nodes = root.querySelectorAll("h1, h2, h3, h4, .h-title, .h-sub, .eyebrow, .section-title, p, li, .vp-line, .advice-quote, .card-read p, .vp-row");
    for (let i = 0; i < nodes.length && len < max; i++) {
      const n = nodes[i];
      if (n.closest(READ_SKIP)) continue;
      if (n.querySelector("button, input, form")) continue;
      const raw = (typeof n.innerText === "string" && n.innerText.trim()) ? n.innerText : n.textContent;
      const t = readable(raw);
      if (!t || out.indexOf(t) >= 0) continue;
      out.push(t);
      len += t.length + 1;
    }
    let s = out.join(". ");
    if (s.length > max) {
      s = s.slice(0, max);
      const cut = Math.max(s.lastIndexOf("."), s.lastIndexOf("요"), s.lastIndexOf("오"));
      if (cut > max * 0.6) s = s.slice(0, cut + 1);
    }
    return s;
  }

  function visibleScreen() {
    const room = document.getElementById("room");
    if (!room || !room.classList.contains("on")) return null;
    const list = Array.prototype.slice.call(room.querySelectorAll(".room-body .screen")).filter((e) => !e.classList.contains("hidden"));
    return list[0] || null;
  }

  function ensureFab() {
    const room = document.getElementById("room");
    if (!room) return null;
    let el = document.getElementById("sqaReadFab");
    if (!el) {
      el = document.createElement("button");
      el.id = "sqaReadFab";
      el.className = "sqa-read-fab";
      el.type = "button";
      el.innerHTML = '<span class="i">🔊</span><b>듣기</b>';
      el.addEventListener("click", () => {
        const scr = visibleScreen();
        const txt = collectText(scr, 1300);
        if (!txt) { note("읽어 드릴 풀이가 아직 없소."); return; }
        if (speaking && speaking.kind === "screen") stopSpeak();
        else speak(txt, "screen", 0);
      });
      room.appendChild(el);
    }
    return el;
  }

  function ensureSheetRead() {
    const ov = document.getElementById("overlay");
    const body = document.getElementById("sheetBody");
    if (!ov || !body) return;
    const btn = body.querySelector(".sqa-sheet-read");
    if (!ov.classList.contains("on")) { if (btn) btn.remove(); return; }
    // 풀이 결과가 담긴 시트에만 단다(후원·설정·방문객 목록 같은 시트는 제외)
    const isResult = !!body.querySelector(".card, .advice-quote, .vp-line, .card-read") &&
      !body.querySelector(".bc-mini, .bc-opt-grid, .bc-amount, .visitor-list, .list-row");
    const txt = isResult ? collectText(body, 1100) : "";
    if (txt.length < 50) { if (btn) btn.remove(); return; }
    if (btn) return;
    const el = document.createElement("button");
    el.type = "button";
    el.className = "sqa-sheet-read";
    el.innerHTML = '<span class="i">🔊</span> 결과 소리로 듣기';
    el.addEventListener("click", () => {
      if (speaking && speaking.kind === "sheet") stopSpeak();
      else speak(collectText(body, 1100), "sheet", 0);
    });
    const grab = body.querySelector(".grabber");
    if (grab && grab.nextSibling) body.insertBefore(el, grab.nextSibling);
    else body.insertBefore(el, body.firstChild);
  }

  function syncSpeechUI() {
    const fab = document.getElementById("sqaReadFab");
    if (fab) {
      const on = speaking && speaking.kind === "screen";
      fab.classList.toggle("on", !!on);
      const b = fab.querySelector("b");
      if (b) b.textContent = on ? "멈추기" : "듣기";
      fab.querySelector(".i").textContent = on ? "⏹" : "🔊";
    }
    const sheetBtn = document.querySelector(".sqa-sheet-read");
    if (sheetBtn) {
      const on = speaking && speaking.kind === "sheet";
      sheetBtn.classList.toggle("on", !!on);
      sheetBtn.innerHTML = on ? '<span class="i">⏹</span> 멈추기' : '<span class="i">🔊</span> 결과 소리로 듣기';
    }
    if (card) {
      card.querySelectorAll(".sqa-tts").forEach((b) => {
        const i = +b.dataset.i;
        const on = speaking && speaking.kind === "qa" && speaking.idx === i;
        b.classList.toggle("on", !!on);
        b.textContent = on ? "⏹ 멈추기" : "🔊 읽어주기";
      });
      card.querySelectorAll(".sqa-msg.speaking").forEach((m) => m.classList.remove("speaking"));
      if (speaking && speaking.kind === "qa") {
        const m = card.querySelector('.sqa-msg.d[data-i="' + speaking.idx + '"]');
        if (m) m.classList.add("speaking");
      }
    }
  }

  let noteTimer = null;
  function note(msg) {
    if (!card) return;
    let el = card.querySelector(".sqa-note");
    if (!el) {
      el = document.createElement("p");
      el.className = "sqa-note";
      const form = card.querySelector(".sqa-form");
      if (form) form.parentNode.insertBefore(el, form.nextSibling);
      else card.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("on");
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => { if (el) el.classList.remove("on"); }, 4200);
  }

  /* ============================================================
     마이크 (Web Speech Recognition)
     ============================================================ */
  const SR = global.SpeechRecognition || global.webkitSpeechRecognition;
  let rec = null, listening = false, micTimer = null;

  function setListening(on, msg) {
    listening = on;
    if (!card) return;
    const mic = card.querySelector(".sqa-mic");
    const box = card.querySelector(".sqa-listen");
    const input = card.querySelector("#sqaInput");
    if (mic) {
      mic.classList.toggle("on", on);
      mic.setAttribute("aria-pressed", on ? "true" : "false");
      mic.title = on ? "듣기 멈추기" : "말로 묻기";
    }
    if (box) {
      box.classList.toggle("on", on || !!msg);
      box.innerHTML = on
        ? '<span class="dot"></span> 듣고 있어요… 말씀하시오'
        : (msg ? esc(msg) : "");
    }
    if (input && on) input.setAttribute("placeholder", "듣고 있어요…");
    if (input && !on) input.setAttribute("placeholder", "궁금한 것을 적어 보시오");
  }

  function startMic() {
    if (!card) return;
    if (!SR) {
      note("이 브라우저에서는 말로 묻기가 되지 않소. 키보드로 적어 주시오.");
      return;
    }
    if (listening) { stopMic(); return; }
    stopSpeak();
    try {
      rec = new SR();
      rec.lang = "ko-KR";
      rec.interimResults = true;
      rec.continuous = false;
      rec.maxAlternatives = 1;
      let base = "";
      rec.onstart = () => { setListening(true); };
      rec.onresult = (ev) => {
        let interim = "", final = "";
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const r = ev.results[i];
          if (r.isFinal) final += r[0].transcript;
          else interim += r[0].transcript;
        }
        const input = card && card.querySelector("#sqaInput");
        if (!input) return;
        if (final) base = (base ? base + " " : "") + final.trim();
        input.value = (base + (interim ? " " + interim : "")).trim();
      };
      rec.onerror = (ev) => {
        const map = {
          "not-allowed": "마이크 사용이 막혀 있소. 브라우저 설정에서 마이크를 허용해 주시오.",
          "service-not-allowed": "이 브라우저에서 음성 인식을 쓸 수 없소. 키보드로 적어 주시오.",
          "no-speech": "소리가 들리지 않았소. 마이크에 조금 가까이 대고 다시 말해 보시오.",
          "audio-capture": "마이크를 찾지 못했소. 기기 마이크를 확인해 주시오.",
          "network": "음성 인식 서버에 닿지 못했소. 잠시 뒤 다시 시도해 보시오."
        };
        setListening(false, map[ev.error] || "음성 입력이 멈췄소. 다시 눌러 보시오.");
      };
      rec.onend = () => { setListening(false); };
      rec.start();
      setListening(true);
      clearTimeout(micTimer);
      micTimer = setTimeout(() => {
        if (!listening) return;
        stopMic();
        setListening(false, "소리가 들리지 않았소. 마이크 가까이에서 다시 말해 보시오.");
      }, 14000);
    } catch (e) {
      setListening(false, "마이크를 열지 못했소. 다시 눌러 보시오.");
    }
  }
  function stopMic() {
    try { if (rec) rec.stop(); } catch (e) { }
    setListening(false);
  }

  /* ============================================================
     저장
     ============================================================ */
  function loadRooms() {
    try { return JSON.parse(localStorage.getItem(LS_QA) || "{}") || {}; } catch (e) { return {}; }
  }
  function saveRooms(o) {
    try { localStorage.setItem(LS_QA, JSON.stringify(o)); } catch (e) { }
  }
  function loadThread(key) {
    const all = loadRooms();
    const t = all[key];
    return t && Array.isArray(t.m) ? t.m : [];
  }
  function saveThread(key, msgs) {
    const all = loadRooms();
    all[key] = { m: msgs.slice(-MAX_MSG), at: Date.now() };
    const keys = Object.keys(all).sort((a, b) => (all[b].at || 0) - (all[a].at || 0));
    keys.slice(MAX_ROOMS).forEach((k) => { delete all[k]; });
    saveRooms(all);
  }

  /* ============================================================
     화면
     ============================================================ */
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));

  let ctx = null;
  let thread = [];
  let busy = false;
  let card = null;
  let resetArmed = false;

  const CHIPS = [
    "💰 재물·사업운", "💼 직장·이직운", "💕 인연·애정운",
    "🌿 건강 조심할 점", "🧭 올해 가장 좋은 방향", "🍀 내 소원 이루어질까", "🏠 이사·집·계약운"
  ];

  function coinRow(coins, hex, animate) {
    return '<div class="sqa-toss" data-anim="' + (animate ? "1" : "0") + '">' +
      '<div class="sqa-coins">' + coins.map((b, i) => coinHTML(b, i, animate)).join("") + "</div>" +
      '<div class="sqa-hex"><b>' + hex.sym + " " + hex.han + "(" + hex.kr + ")</b> · " + hex.nat + " · " + hex.gil + "</div>" +
      "</div>";
  }

  function msgText(m) {
    const ps = String(m.t || "").split("\n").filter(Boolean);
    return (m.h ? m.h + ". " : "") + ps.join(" ");
  }

  function aiBlock(m, i) {
    const coins = m.c || [];
    const ps = String(m.t || "").split("\n").filter(Boolean);
    const isOn = speaking && speaking.kind === "qa" && speaking.idx === i;
    return '<div class="sqa-msg d" data-i="' + i + '">' +
      '<div class="sqa-bub">' +
        (coins.length
          ? '<div class="sqa-toss">' +
            '<div class="sqa-coins">' + coins.map((b) => miniCoin(b)).join("") + "</div>" +
            (m.h ? '<div class="sqa-hex">' + esc(m.h) + "</div>" : "") +
            "</div>"
          : "") +
        ps.map((p, k) => '<p style="animation-delay:' + (k * 0.06).toFixed(2) + 's">' + esc(p) + "</p>").join("") +
        '<button class="sqa-tts' + (isOn ? " on" : "") + '" type="button" data-i="' + i + '">' + (isOn ? "⏹ 멈추기" : "🔊 읽어주기") + "</button>" +
      "</div>" +
      "</div>";
  }

  function fadeFeed() {
    const log = card && card.querySelector(".sqa-log");
    const wrap = card && card.querySelector(".sqa-logwrap");
    if (!log || !wrap) return;
    wrap.classList.toggle("at-end", log.scrollTop + log.clientHeight >= log.scrollHeight - 4);
  }

  function renderLog() {
    const log = card && card.querySelector(".sqa-log");
    const feed = card && card.querySelector(".sqa-feed");
    if (!log || !feed) return;
    if (!thread.length) {
      feed.innerHTML =
        '<div class="sqa-msg d"><div class="sqa-bub"><p>사주를 다 살펴보았소. 그중에서도 가장 궁금한 것이 무엇이오?</p></div></div>' +
        '<div class="sqa-msg d sqa-hint"><div class="sqa-bub"><p>아래 엽전 세 닢을 던져 물음을 올리면, 나온 괘와 그대 8자를 함께 읽어 답하겠소.</p></div></div>';
      fadeFeed();
      return;
    }
    feed.innerHTML = thread.map((m, i) => m.r === "u"
      ? '<div class="sqa-msg u"><div class="sqa-bub"><p>' + esc(m.t) + "</p></div></div>"
      : aiBlock(m, i)).join("");
    log.scrollTop = log.scrollHeight;
    fadeFeed();
  }

  function scrollCardIntoView() {
    if (!card) return;
    try { card.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (e) { }
  }

  function buildCard() {
    const el = document.createElement("div");
    el.className = "card sqa-card";
    el.id = "sqaCard";
    el.innerHTML =
      '<div class="sqa-head">' +
        '<div class="sqa-ava"><img src="assets/img/sage-saju.webp" alt="사주 도사님"></div>' +
        '<div class="sqa-tt">' +
          '<div class="sqa-title">💬 도사님께 사주 질문방</div>' +
          '<div class="sqa-sub">엽전 세 닢을 던져, 사주에 이어 물어보시오</div>' +
        "</div>" +
        '<button class="sqa-auto' + (autoRead ? " on" : "") + '" type="button" aria-pressed="' + (autoRead ? "true" : "false") + '">🔊 자동 읽기</button>' +
      "</div>" +
      '<div class="sqa-tools"><button class="sqa-reset" type="button">대화 지우기</button></div>' +
      '<div class="sqa-logwrap" id="sqaLogwrap"><div class="sqa-log" id="sqaLog" aria-live="polite"><div class="sqa-feed" id="sqaFeed"></div></div></div>' +
      '<div class="sqa-chips" id="sqaChips">' +
        CHIPS.map((q) => '<button class="sqa-chip" type="button" data-q="' + esc(q) + '">' + esc(q) + "</button>").join("") +
      "</div>" +
      '<div class="sqa-listen" role="status"></div>' +
      '<form class="sqa-form" id="sqaForm" autocomplete="off">' +
        '<input id="sqaInput" type="text" maxlength="120" placeholder="궁금한 것을 적어 보시오" aria-label="사주에 물어볼 질문">' +
        '<button class="sqa-mic" type="button" aria-pressed="false" title="말로 묻기" aria-label="마이크 켜기">🎙️</button>' +
        '<button type="submit" id="sqaSend">물어보기</button>' +
      "</form>" +
      '<p class="sqa-fine">엽전 3닢과 사주 8자를 함께 읽은 참고 이야기입니다 · 미래를 단정하지 않습니다</p>';

    const log = el.querySelector(".sqa-log");

    el.querySelector(".sqa-chips").addEventListener("click", (ev) => {
      const b = ev.target.closest(".sqa-chip");
      if (b) ask(b.dataset.q);
    });

    log.addEventListener("scroll", fadeFeed, { passive: true });
    log.addEventListener("click", (ev) => {
      const b = ev.target.closest(".sqa-tts");
      if (!b) return;
      const i = +b.dataset.i;
      const m = thread[i];
      if (!m) return;
      toggleSpeak(msgText(m), "qa", i);
    });

    el.querySelector("#sqaForm").addEventListener("submit", (ev) => {
      ev.preventDefault();
      const inp = el.querySelector("#sqaInput");
      const v = (inp.value || "").trim();
      if (!v) { inp.focus(); return; }
      stopMic();
      inp.value = "";
      ask(v);
    });

    el.querySelector(".sqa-mic").addEventListener("click", startMic);

    el.querySelector(".sqa-auto").addEventListener("click", (ev) => {
      autoRead = !autoRead;
      const b = ev.currentTarget;
      b.classList.toggle("on", autoRead);
      b.setAttribute("aria-pressed", autoRead ? "true" : "false");
      try { localStorage.setItem(LS_AUTO, autoRead ? "1" : "0"); } catch (e) { }
      if (!autoRead) stopSpeak();
      note(autoRead ? "이제 답변이 나오면 바로 읽어 드리겠소." : "자동 읽기를 멈추었소. 말풍선의 읽어주기로 들으시오.");
    });

    el.querySelector(".sqa-reset").addEventListener("click", () => {
      const btn = el.querySelector(".sqa-reset");
      if (!resetArmed) {
        resetArmed = true;
        btn.textContent = "정말 지울까요?";
        btn.classList.add("armed");
        setTimeout(() => { if (resetArmed) { resetArmed = false; btn.textContent = "대화 지우기"; btn.classList.remove("armed"); } }, 3200);
        return;
      }
      resetArmed = false;
      btn.textContent = "대화 지우기";
      btn.classList.remove("armed");
      stopSpeak();
      thread = [];
      saveThread(ctx.key, thread);
      renderLog();
      log.scrollTop = 0;
    });

    return el;
  }

  function ask(text) {
    const q = String(text || "").trim();
    if (!q || busy || !card) return;
    const log = card.querySelector(".sqa-log");
    busy = true;
    card.classList.add("busy");

    thread.push({ r: "u", t: q });
    saveThread(ctx.key, thread);
    renderLog();
    log.scrollTop = log.scrollHeight;

    // 엽전 세 닢을 던진다
    const { coins, hex } = toss();
    const stage = document.createElement("div");
    stage.className = "sqa-msg d sqa-tossing";
    stage.innerHTML = '<div class="sqa-bub sqa-tossbub">' + coinRow(coins, hex, true) +
      '<p class="sqa-rolling">세 닢을 던지는 중…</p></div>';
    (card.querySelector(".sqa-feed") || log).appendChild(stage);
    log.scrollTop = log.scrollHeight;
    fadeFeed();
    coinSound();

    setTimeout(() => {
      const hexLine = stage.querySelector(".sqa-hex");
      if (hexLine) hexLine.classList.add("on");
    }, 1000);

    setTimeout(() => {
      if (!card) return;
      const turn = thread.filter((m) => m.r === "d").length + 1;
      const paras = compose(ctx, q, hex, turn);
      thread.push({ r: "d", t: paras.join("\n"), c: coins, h: hex.sym + " " + hex.han + "(" + hex.kr + ")괘" });
      saveThread(ctx.key, thread);
      renderLog();
      busy = false;
      card.classList.remove("busy");
      log.scrollTop = log.scrollHeight;
      scrollCardIntoView();
      if (autoRead) {
        const idx = thread.length - 1;
        speak(msgText(thread[idx]), "qa", idx);
      }
    }, 1320);
  }

  /* ---------- 사주 결과 화면에 붙이기 ---------- */
  function stateSaju() {
    try {
      const raw = localStorage.getItem(LS_APP);
      if (!raw) return null;
      const s = JSON.parse(raw);
      return s && s.lastSaju ? s.lastSaju : null;
    } catch (e) { return null; }
  }

  function refresh() {
    const screen = document.getElementById("screen-saju");
    if (!screen) return;
    const result = screen.querySelector(".pillar-table");
    const exist = document.getElementById("sqaCard");

    if (!result) {
      if (exist) exist.remove();
      if (card) stopSpeak();
      card = null;
      return;
    }
    if (exist) { card = exist; return; }

    const s = stateSaju();
    if (!s) return;
    try { ctx = buildCtx(s); } catch (e) { return; }

    card = buildCard();
    thread = loadThread(ctx.key);
    const disc = screen.querySelectorAll(".disclaimer");
    const anchor = disc.length ? disc[disc.length - 1] : null;
    if (anchor && anchor.parentNode === screen) screen.insertBefore(card, anchor);
    else screen.appendChild(card);
    renderLog();
  }

  let raf = null;
  function schedule() {
    if (raf) return;
    raf = setTimeout(() => { raf = null; refresh(); }, 40);
  }

  /* ---------- 화면 상태 감시(방 닫기·시트 닫기에서 소리 멈춤) ---------- */
  let sig = "";
  function tick() {
    const room = document.getElementById("room");
    const ov = document.getElementById("overlay");
    const roomOn = !!(room && room.classList.contains("on"));
    const ovOn = !!(ov && ov.classList.contains("on"));
    const scr = visibleScreen();
    const scrId = scr ? scr.id : "";
    const hasResult = !!(scr && (scr.querySelector(".card") || scr.querySelector(".tarot-card")));
    const next = [roomOn, ovOn, scrId, hasResult].join("|");

    const fab = ensureFab();
    if (fab) fab.hidden = !(roomOn && hasResult);

    if (speaking && speaking.kind === "screen" && next !== sig) stopSpeak();
    if (speaking && speaking.kind === "sheet" && !ovOn) stopSpeak();
    if (speaking && speaking.kind === "qa" && !roomOn) stopSpeak();

    ensureSheetRead();
    if (next !== sig) sig = next;
  }

  let mounted = false;
  function mount() {
    if (mounted) return;
    const target = document.getElementById("screen-saju") || document.getElementById("roomBody");
    if (!target || !document.body) { setTimeout(mount, 300); return; }
    mounted = true;
    const obs = new MutationObserver(schedule);
    obs.observe(target, { childList: true, subtree: true });
    const bodyObs = new MutationObserver(() => { if (!document.getElementById("sqaCard")) schedule(); });
    bodyObs.observe(document.body, { childList: true });
    setInterval(tick, 700);
    schedule();
    setTimeout(schedule, 600);
    tick();
  }

  global.SajuQA = {
    refresh: refresh,
    ask: function (q) { refresh(); if (card) ask(q); },
    stop: stopSpeak
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})(window);
