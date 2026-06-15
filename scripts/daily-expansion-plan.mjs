/**
 * 생활영어(daily) 확장 설계 척추 — 신규 100권(daily-51 ~ daily-150).
 * 목표: 각 stage(1~6) 25권. 현재 8/8/8/8/9/9 → +17/+17/+17/+17/+16/+16.
 * 난이도 사다리·캐스트(단계별 다양화)·고유 주제(기존 50권 중복 회피)를 한 곳에 고정.
 * 텍스트(시드)·이미지가 공통 참조.
 */

// 단계별 캐스트 바이블 (이미지 일관성 앵커). Jun은 전권 고정 주인공.
export const CAST = {
  jun: "Jun, a cheerful Korean boy about 8, short tousled black hair, round friendly face, red t-shirt, blue shorts",
  mina: "Mina, a friendly Korean girl about 8, shoulder-length black hair with a small yellow hairpin, green dress",
  mom: "Mom, a warm Korean woman about 35, shoulder-length hair, soft blue sweater",
  dad: "Dad, a kind Korean man about 38, short black hair, thin glasses, plaid shirt",
  grandma: "Grandma, a gentle elderly Korean woman, gray hair in a bun, floral blouse",
  grandpa: "Grandpa, a kind elderly Korean man, gray hair, round glasses, beige cardigan",
  teacher: "Ms. Park, a young Korean teacher about 28, ponytail, cozy cardigan",
};

const BANDS = {
  1: { level: "preA1", ageBand: "8-10", pages: "6~7", words: "50~70",  sent: "각 페이지 1문장, 현재형 SVO·sight words, 반복 리듬" },
  2: { level: "A1",    ageBand: "8-10", pages: "8~9", words: "90~120", sent: "페이지당 1~2문장, and/but·과거형 도입·짧은 대화" },
  3: { level: "A2",    ageBand: "9-11", pages: "10~11", words: "150~190", sent: "페이지당 2문장, because/when·원인과 결과·감정" },
  4: { level: "A2",    ageBand: "9-11", pages: "10~11", words: "150~190", sent: "페이지당 2문장, 순차적 문제해결 흐름·대화" },
  5: { level: "B1",    ageBand: "10-12", pages: "12~14", words: "240~320", sent: "페이지당 2~3문장, 공동체 맥락·시제 혼합·주제의식" },
  6: { level: "B1",    ageBand: "10-12", pages: "12~14", words: "240~320", sent: "페이지당 2~3문장, 계획·성찰·원인과 결과, 풍부한 대화" },
};

// [num, slug-suffix, title(en), title_ko, stage, cast[], topic 가이드]
const RAW = [
  // ── STAGE 1 (preA1) +17 ──
  [51, "i-wash-my-face", "I Wash My Face", "세수를 해요", 1, ["jun"], "아침에 일어나 세수하고 물·비누·수건 표현"],
  [52, "my-blue-cup", "My Blue Cup", "내 파란 컵", 1, ["jun"], "내 컵으로 물 마시기, 색깔·간단한 동작"],
  [53, "my-socks", "My Socks", "내 양말", 1, ["jun"], "양말을 신어요, 한 짝 두 짝 세기"],
  [54, "i-eat-an-apple", "I Eat an Apple", "사과를 먹어요", 1, ["jun"], "사과를 씻고 한 입 먹기, 맛 표현"],
  [55, "my-little-dog", "My Little Dog", "내 작은 강아지", 1, ["jun"], "강아지와 인사하고 함께 놀기"],
  [56, "i-can-jump", "I Can Jump", "나는 뛸 수 있어요", 1, ["jun"], "I can 동사 반복, 뛰고 달리고 박수"],
  [57, "the-big-bus", "The Big Bus", "큰 버스", 1, ["jun"], "버스를 보고 타기, 크다/노랗다"],
  [58, "my-yellow-hat", "My Yellow Hat", "내 노란 모자", 1, ["jun"], "모자를 쓰고 밖에 나가기, 색깔"],
  [59, "i-see-a-bird", "I See a Bird", "새가 보여요", 1, ["jun"], "I see 반복, 새·나무·하늘"],
  [60, "my-warm-bed", "My Warm Bed", "내 따뜻한 침대", 1, ["jun"], "잠자리에 들기, 따뜻하다·포근하다"],
  [61, "i-brush-my-hair", "I Brush My Hair", "머리를 빗어요", 1, ["jun"], "거울 앞에서 머리 빗기"],
  [62, "my-green-ball", "My Green Ball", "내 초록 공", 1, ["jun"], "공을 굴리고 던지고 받기"],
  [63, "i-drink-milk", "I Drink Milk", "우유를 마셔요", 1, ["jun"], "우유 한 잔 마시기, 맛있다"],
  [64, "my-red-boots", "My Red Boots", "내 빨간 장화", 1, ["jun"], "장화를 신고 물웅덩이 첨벙"],
  [65, "i-wave-hello", "I Wave Hello", "손 흔들어 인사해요", 1, ["jun"], "친구에게 손 흔들어 인사하기"],
  [66, "my-soft-pillow", "My Soft Pillow", "내 부드러운 베개", 1, ["jun"], "베개를 안고 잠들기, 부드럽다"],
  [67, "i-count-my-toes", "I Count My Toes", "발가락을 세요", 1, ["jun"], "발가락 하나둘 세기, 숫자 1~10"],

  // ── STAGE 2 (A1) +17 ──
  [68, "getting-dressed", "Getting Dressed", "옷 입기", 2, ["jun", "mom"], "아침에 옷 골라 입기, 엄마가 도와줌"],
  [69, "the-morning-bus", "The Morning Bus", "아침 버스", 2, ["jun", "mina"], "버스 정류장에서 미나를 만나 같이 타기"],
  [70, "my-breakfast", "My Breakfast", "내 아침밥", 2, ["jun", "mom"], "밥·달걀·과일로 아침 먹기"],
  [71, "the-spilled-juice", "The Spilled Juice", "쏟은 주스", 2, ["jun", "mom"], "주스를 쏟고 함께 닦기, 괜찮아"],
  [72, "the-puddle-walk", "The Puddle Walk", "물웅덩이 산책", 2, ["jun", "mina"], "비 온 뒤 웅덩이 밟으며 걷기"],
  [73, "at-the-bakery", "At the Bakery", "빵집에서", 2, ["jun", "mom"], "빵집에서 빵 고르고 사기"],
  [74, "my-new-pencil-case", "My New Pencil Case", "새 필통", 2, ["jun", "mina"], "새 필통 자랑하고 친구와 비교"],
  [75, "building-a-snowman", "Building a Snowman", "눈사람 만들기", 2, ["jun", "mina"], "눈을 굴려 눈사람 만들기"],
  [76, "helping-grandma", "Helping Grandma", "할머니 돕기", 2, ["jun", "grandma"], "할머니와 함께 빨래 개기"],
  [77, "waiting-for-the-train", "Waiting for the Train", "기차를 기다려요", 2, ["jun", "dad"], "역에서 아빠와 기차 기다리기"],
  [78, "my-best-friend", "My Best Friend", "내 단짝", 2, ["jun", "mina"], "단짝 미나와 함께 노는 하루"],
  [79, "the-runaway-balloon", "The Runaway Balloon", "도망간 풍선", 2, ["jun", "mina"], "풍선을 놓쳐 하늘로 날아감"],
  [80, "bath-time", "Bath Time", "목욕 시간", 2, ["jun", "mom"], "거품 목욕하고 머리 감기"],
  [81, "the-windy-day", "The Windy Day", "바람 부는 날", 2, ["jun", "mina"], "바람에 모자·나뭇잎이 날림"],
  [82, "my-piggy-bank", "My Piggy Bank", "내 돼지 저금통", 2, ["jun", "dad"], "동전을 모아 저금통에 넣기"],
  [83, "watering-the-plant", "Watering the Plant", "식물에 물 주기", 2, ["jun", "grandpa"], "할아버지와 화분에 물 주기"],
  [84, "walking-the-puppy", "Walking the Puppy", "강아지 산책", 2, ["jun", "mina"], "강아지를 데리고 공원 산책"],

  // ── STAGE 3 (A2) +17 ──
  [85, "the-haircut", "The Haircut", "이발하는 날", 3, ["jun", "mom"], "미용실에서 머리 자르기, 처음엔 긴장"],
  [86, "the-swimming-lesson", "The Swimming Lesson", "수영 강습", 3, ["jun", "mina", "teacher"], "수영을 배우며 물이 무서웠다가 해냄"],
  [87, "the-piano-recital", "The Piano Recital", "피아노 발표회", 3, ["jun", "mom", "mina"], "발표회에서 떨리지만 끝까지 연주"],
  [88, "the-broken-toy", "The Broken Toy", "망가진 장난감", 3, ["jun", "dad"], "장난감이 망가져 아빠와 함께 고침"],
  [89, "the-surprise-party", "The Surprise Party", "깜짝 파티", 3, ["jun", "mina", "mom"], "친구를 위한 깜짝 생일 파티 준비"],
  [90, "the-class-trip", "The Class Trip", "현장학습", 3, ["jun", "mina", "teacher"], "버스 타고 간 현장학습 하루"],
  [91, "the-rainy-game", "The Rainy Game", "비 오는 날 경기", 3, ["jun", "mina"], "비가 와서 실내에서 게임으로 바꿈"],
  [92, "the-new-student", "The New Student", "전학생", 3, ["jun", "teacher"], "전학 온 친구에게 학교를 안내"],
  [93, "the-cookie-sale", "The Cookie Sale", "쿠키 판매", 3, ["jun", "mina"], "쿠키를 구워 팔며 돈 세기"],
  [94, "the-ant-farm", "The Ant Farm", "개미 농장", 3, ["jun", "grandpa"], "개미 농장을 관찰하며 배우기"],
  [95, "the-tree-house", "The Tree House", "나무 위 오두막", 3, ["jun", "dad", "mina"], "아빠와 나무 위 오두막 만들기"],
  [96, "the-snow-day", "The Snow Day", "눈 오는 날", 3, ["jun", "mina"], "눈싸움하고 썰매 타는 하루"],
  [97, "the-lemonade-stand", "The Lemonade Stand", "레모네이드 가판대", 3, ["jun", "mina"], "더운 날 레모네이드를 만들어 팜"],
  [98, "the-art-class", "The Art Class", "미술 시간", 3, ["jun", "teacher", "mina"], "그림을 그리며 색을 섞어 보기"],
  [99, "the-lost-key", "The Lost Key", "잃어버린 열쇠", 3, ["jun", "grandma"], "열쇠를 잃어버려 함께 찾기"],
  [100, "the-special-gift", "The Special Gift", "특별한 선물", 3, ["jun", "grandpa"], "할아버지께 손수 만든 선물 드리기"],
  [101, "the-campfire-night", "The Campfire Night", "모닥불 밤", 3, ["jun", "dad", "mina"], "모닥불 곁에서 이야기 나누는 밤"],

  // ── STAGE 4 (A2, 순차 문제해결) +17 ──
  [102, "the-butterfly-garden", "The Butterfly Garden", "나비 정원", 4, ["jun", "teacher", "mina"], "애벌레가 나비가 되는 과정 관찰"],
  [103, "the-magic-show", "The Magic Show", "마술쇼", 4, ["jun", "mina", "dad"], "마술을 연습해 무대에서 선보임"],
  [104, "the-broken-bike", "The Broken Bike", "고장난 자전거", 4, ["jun", "dad"], "자전거 체인이 빠져 함께 고침"],
  [105, "the-library-card", "The Library Card", "도서관 카드", 4, ["jun", "teacher"], "첫 도서관 카드를 만들어 책 빌리기"],
  [106, "the-autumn-festival", "The Autumn Festival", "가을 축제", 4, ["jun", "mina", "mom"], "가을 축제에서 부스를 돌며 즐김"],
  [107, "the-volcano-project", "The Volcano Project", "화산 만들기", 4, ["jun", "mina"], "베이킹소다로 화산 모형 실험"],
  [108, "the-class-bake-sale", "The Class Bake Sale", "학급 베이크 세일", 4, ["jun", "mina", "teacher"], "반 친구들과 베이크 세일 준비"],
  [109, "the-pen-pal-letter", "The Pen Pal Letter", "펜팔 편지", 4, ["jun", "teacher"], "멀리 사는 펜팔에게 편지 쓰기"],
  [110, "the-school-band", "The School Band", "학교 밴드", 4, ["jun", "mina", "teacher"], "악기를 정해 밴드 연습하기"],
  [111, "the-search-for-mochi", "The Search for Mochi", "모치를 찾아서", 4, ["jun", "mina"], "사라진 고양이 모치를 단서 따라 찾기"],
  [112, "the-clothing-swap", "The Clothing Swap", "옷 나눔 행사", 4, ["jun", "mom", "mina"], "작아진 옷을 모아 서로 나눔"],
  [113, "the-class-vote", "The Class Vote", "학급 투표", 4, ["jun", "teacher", "mina"], "반 행사 정하려 투표하기"],
  [114, "the-field-day", "The Field Day", "운동회", 4, ["jun", "mina", "teacher"], "이어달리기와 줄다리기로 협동"],
  [115, "the-puppet-show", "The Puppet Show", "인형극", 4, ["jun", "mina"], "양말 인형을 만들어 인형극 공연"],
  [116, "the-winter-fair", "The Winter Fair", "겨울 장터", 4, ["jun", "mina", "mom"], "겨울 장터에서 따뜻한 음식 나눔"],
  [117, "the-class-photo", "The Class Photo", "단체 사진", 4, ["jun", "teacher", "mina"], "단체 사진 찍는 날의 소동"],
  [118, "the-helping-hands", "The Helping Hands", "돕는 손길", 4, ["jun", "grandma", "mina"], "이웃 어르신을 함께 도와드리기"],

  // ── STAGE 5 (B1, 공동체 맥락) +16 ──
  [119, "the-park-cleanup", "The Park Cleanup", "공원 청소", 5, ["jun", "mina", "teacher"], "친구들과 동네 공원 쓰레기 줍기"],
  [120, "the-school-magazine", "The School Magazine", "학교 잡지", 5, ["jun", "mina", "teacher"], "반 친구들과 학교 잡지 만들기"],
  [121, "the-charity-run", "The Charity Run", "자선 달리기", 5, ["jun", "dad", "mina"], "기부를 위해 함께 달리기 대회 참가"],
  [122, "the-story-corner", "The Story Corner", "이야기 코너", 5, ["jun", "mina", "grandma"], "도서관 한켠에서 동생들에게 책 읽어주기"],
  [123, "the-food-drive", "The Food Drive", "음식 나눔", 5, ["jun", "teacher", "mina"], "통조림을 모아 이웃에게 나눔"],
  [124, "the-charity-concert", "The Charity Concert", "자선 음악회", 5, ["jun", "mina", "teacher"], "음악회를 열어 모금하기"],
  [125, "the-pond-project", "The Pond Project", "연못 살리기", 5, ["jun", "mina", "teacher"], "학교 연못을 깨끗이 되살리기"],
  [126, "the-class-podcast", "The Class Podcast", "학급 팟캐스트", 5, ["jun", "mina"], "반 소식을 녹음해 팟캐스트로 만들기"],
  [127, "the-school-mural", "The School Mural", "학교 벽화", 5, ["jun", "mina", "teacher"], "다 함께 학교 벽에 벽화 그리기"],
  [128, "the-stargazing-night", "The Stargazing Night", "별 관측의 밤", 5, ["jun", "dad", "mina"], "망원경으로 별자리 관찰하는 밤"],
  [129, "the-harvest-day", "The Harvest Day", "수확의 날", 5, ["jun", "grandpa", "mina"], "텃밭 채소를 수확해 나눔"],
  [130, "the-reading-buddies", "The Reading Buddies", "책 읽어주기 짝꿍", 5, ["jun", "mina", "teacher"], "후배와 짝을 지어 함께 책 읽기"],
  [131, "the-weather-club", "The Weather Club", "날씨 동아리", 5, ["jun", "mina"], "매일 날씨를 기록하는 동아리 활동"],
  [132, "the-recycled-art-show", "The Recycled Art Show", "재활용 미술전", 5, ["jun", "mina", "teacher"], "버려진 물건으로 작품 만들어 전시"],
  [133, "the-neighbor-helper", "The Neighbor Helper", "이웃 도우미", 5, ["jun", "grandma"], "옆집 어르신의 장보기를 돕기"],
  [134, "the-school-radio", "The School Radio", "학교 라디오", 5, ["jun", "mina", "teacher"], "점심시간 교내 방송을 진행하기"],

  // ── STAGE 6 (B1, 계획·성찰) +16 ──
  [135, "the-big-project-plan", "The Big Project Plan", "큰 프로젝트 계획", 6, ["jun", "mina", "teacher"], "큰 모둠 프로젝트를 단계별로 계획"],
  [136, "the-volunteer-week", "The Volunteer Week", "봉사 주간", 6, ["jun", "mina", "teacher"], "한 주 동안 여러 봉사 활동 실천"],
  [137, "the-class-business", "The Class Business", "학급 회사", 6, ["jun", "mina", "teacher"], "반에서 작은 회사를 만들어 운영"],
  [138, "the-eco-challenge", "The Eco Challenge", "환경 챌린지", 6, ["jun", "mina", "teacher"], "일주일 환경 보호 챌린지 도전"],
  [139, "the-mentor-program", "The Mentor Program", "멘토 프로그램", 6, ["jun", "mina", "teacher"], "후배를 돕는 멘토가 되어 보기"],
  [140, "the-festival-plan", "The Festival Plan", "축제 기획", 6, ["jun", "mina", "teacher"], "학교 축제를 처음부터 기획·운영"],
  [141, "the-community-survey", "The Community Survey", "마을 설문조사", 6, ["jun", "mina", "teacher"], "마을 사람들 의견을 조사해 발표"],
  [142, "the-invention-fair", "The Invention Fair", "발명 박람회", 6, ["jun", "mina", "teacher"], "문제를 풀 발명품을 만들어 전시"],
  [143, "the-debate-day", "The Debate Day", "토론의 날", 6, ["jun", "mina", "teacher"], "주제를 정해 찬반 토론하기"],
  [144, "the-history-project", "The History Project", "역사 프로젝트", 6, ["jun", "mina", "grandpa"], "할아버지께 옛이야기 듣고 기록"],
  [145, "the-kindness-campaign", "The Kindness Campaign", "친절 캠페인", 6, ["jun", "mina", "teacher"], "학교에 친절 캠페인을 퍼뜨리기"],
  [146, "the-future-city-model", "The Future City Model", "미래 도시 모형", 6, ["jun", "mina", "teacher"], "미래 도시를 상상해 모형으로 제작"],
  [147, "the-time-capsule", "The Time Capsule", "타임캡슐", 6, ["jun", "mina", "teacher"], "추억을 담은 타임캡슐을 묻기"],
  [148, "the-green-rooftop", "The Green Rooftop", "옥상 정원", 6, ["jun", "mina", "teacher"], "학교 옥상에 정원을 만들 계획"],
  [149, "the-coding-club", "The Coding Club", "코딩 동아리", 6, ["jun", "mina", "teacher"], "간단한 게임을 코딩해 만드는 동아리"],
  [150, "the-graduation-plan", "The Graduation Plan", "졸업 계획", 6, ["jun", "mina", "teacher"], "졸업을 앞두고 추억을 준비"],
];

export const PLAN = RAW.map(([num, suffix, title, title_ko, stage, cast, topic]) => ({
  num,
  slug: `daily-${num}-${suffix}`,
  title,
  title_ko,
  stage,
  level: BANDS[stage].level,
  ageBand: BANDS[stage].ageBand,
  cast,
  topic,
  band: BANDS[stage],
}));

// CLI: node scripts/daily-expansion-plan.mjs  → 검증 출력
if (import.meta.url === `file://${process.argv[1]}`) {
  const byStage = {};
  for (const p of PLAN) byStage[p.stage] = (byStage[p.stage] || 0) + 1;
  console.log("신규 권수:", PLAN.length);
  console.log("stage별:", byStage);
  const slugs = PLAN.map((p) => p.slug);
  const dupSlug = slugs.filter((s, i) => slugs.indexOf(s) !== i);
  console.log("slug 중복:", dupSlug.length ? dupSlug : "없음");
}
