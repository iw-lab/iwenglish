/**
 * 생활영어 그림책 확장 3차: daily-25 ~ daily-40.
 *
 * 목표:
 * - 전체 seed 그림책 34권 -> 50권.
 * - daily 시리즈는 24권 -> 40권.
 * - 6단계 난이도 차이가 실제 페이지 수/문장 길이에 드러나도록 구성.
 *
 *   node scripts/seed-books-25-40.mjs
 *   node scripts/seed-books-25-40.mjs --force
 */
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SEED = join(process.cwd(), "data", "seed");
const FORCE = process.argv.includes("--force");

const RULES = {
  1: { level: "preA1", pages: 6, label: "very short repeated sentences" },
  2: { level: "A1", pages: 7, label: "short daily sentences" },
  3: { level: "A2", pages: 8, label: "longer actions with reasons" },
  4: { level: "A2", pages: 9, label: "sequence and problem solving" },
  5: { level: "B1", pages: 10, label: "richer description and feelings" },
  6: { level: "B1", pages: 12, label: "multi-sentence pages with cause/effect" },
};

// [en, ko]
const B = [
  {
    slug: "daily-25-my-red-bag",
    title: "My Red Bag",
    title_ko: "내 빨간 가방",
    level: "preA1",
    stage: 1,
    summary_ko: "가방 안 물건을 하나씩 꺼내며 가장 쉬운 명사와 색깔 표현을 반복해요.",
    P: [
      ["This is my red bag.", "이건 내 빨간 가방이에요."],
      ["I have a book.", "나는 책이 있어요."],
      ["I have a pencil.", "나는 연필이 있어요."],
      ["I have a snack.", "나는 간식이 있어요."],
      ["My bag is not heavy.", "내 가방은 무겁지 않아요."],
      ["I am ready for school.", "나는 학교 갈 준비가 됐어요."],
    ],
    Q: [
      ["가방은 무슨 색인가요?", ["파랑", "빨강", "초록", "노랑"], 1, "red bag은 빨간 가방이에요."],
      ["가방 안에 무엇이 있었나요?", ["책", "모자", "신발", "컵"], 0, "I have a book."],
      ["연필은 영어로 무엇인가요?", ["pencil", "bag", "snack", "school"], 0, "pencil은 연필이에요."],
      ["가방은 무거웠나요?", ["네", "아니요", "몰라요", "아주 커요"], 1, "not heavy는 무겁지 않다는 뜻이에요."],
      ["나는 어디 갈 준비가 됐나요?", ["학교", "공원", "병원", "가게"], 0, "ready for school — 학교 갈 준비예요."],
    ],
  },
  {
    slug: "daily-26-snowy-morning",
    title: "Snowy Morning",
    title_ko: "눈 오는 아침",
    level: "preA1",
    stage: 1,
    summary_ko: "눈 오는 아침에 옷을 챙겨 입고 밖을 보는 짧은 반복 문장 그림책이에요.",
    P: [
      ["It is snowy today.", "오늘은 눈이 와요."],
      ["I see white snow.", "나는 하얀 눈을 봐요."],
      ["I put on my coat.", "나는 코트를 입어요."],
      ["I put on my hat.", "나는 모자를 써요."],
      ["My hands are warm.", "내 손은 따뜻해요."],
      ["Snowy days are bright.", "눈 오는 날은 밝아요."],
    ],
    Q: [
      ["오늘 날씨는 어떤가요?", ["눈", "비", "바람", "햇빛"], 0, "snowy는 눈이 온다는 뜻이에요."],
      ["눈은 무슨 색인가요?", ["빨강", "파랑", "하양", "검정"], 2, "white snow — 하얀 눈이에요."],
      ["무엇을 입었나요?", ["코트", "수영복", "앞치마", "반바지"], 0, "put on my coat — 코트를 입었어요."],
      ["머리에 무엇을 썼나요?", ["모자", "신발", "가방", "장갑"], 0, "hat은 모자예요."],
      ["손은 어땠나요?", ["차가웠어요", "따뜻했어요", "아팠어요", "더러웠어요"], 1, "warm은 따뜻하다는 뜻이에요."],
    ],
  },
  {
    slug: "daily-27-the-lost-crayon",
    title: "The Lost Crayon",
    title_ko: "사라진 크레용",
    level: "A1",
    stage: 2,
    summary_ko: "그림 시간에 사라진 크레용을 찾으며 장소 전치사와 쉬운 질문 표현을 익혀요.",
    P: [
      ["It is art time in class.", "교실에서 미술 시간이에요."],
      ["I want my blue crayon.", "나는 파란 크레용이 필요해요."],
      ["It is not in my box.", "그건 내 상자 안에 없어요."],
      ["I look under the desk.", "나는 책상 아래를 봐요."],
      ["My friend points to the floor.", "친구가 바닥을 가리켜요."],
      ["There is my blue crayon!", "거기 내 파란 크레용이 있어요!"],
      ["Now I can finish my sky.", "이제 하늘을 완성할 수 있어요."],
    ],
    Q: [
      ["무슨 시간이었나요?", ["체육", "미술", "점심", "음악"], 1, "art time은 미술 시간이에요."],
      ["필요한 크레용은 무슨 색인가요?", ["빨강", "파랑", "초록", "검정"], 1, "blue crayon — 파란 크레용이에요."],
      ["처음에 크레용은 어디에 없었나요?", ["상자", "가방", "주머니", "책"], 0, "not in my box — 상자 안에 없었어요."],
      ["친구는 어디를 가리켰나요?", ["창문", "바닥", "문", "칠판"], 1, "points to the floor — 바닥을 가리켜요."],
      ["크레용으로 무엇을 완성했나요?", ["하늘", "집", "꽃", "차"], 0, "finish my sky — 하늘을 완성해요."],
    ],
  },
  {
    slug: "daily-28-making-pancakes",
    title: "Making Pancakes",
    title_ko: "팬케이크 만들기",
    level: "A1",
    stage: 2,
    summary_ko: "가족과 팬케이크를 만들며 재료, 순서, 맛 표현을 짧은 문장으로 배워요.",
    P: [
      ["Dad and I make pancakes.", "아빠와 나는 팬케이크를 만들어요."],
      ["We mix eggs and milk.", "우리는 달걀과 우유를 섞어요."],
      ["I stir the bowl slowly.", "나는 그릇을 천천히 저어요."],
      ["Dad pours the mix in the pan.", "아빠가 반죽을 팬에 부어요."],
      ["The pancake turns golden.", "팬케이크가 노릇해져요."],
      ["We add fruit on top.", "우리는 위에 과일을 올려요."],
      ["Breakfast smells sweet today.", "오늘 아침은 달콤한 냄새가 나요."],
    ],
    Q: [
      ["누구와 팬케이크를 만들었나요?", ["아빠", "선생님", "친구", "혼자"], 0, "Dad and I — 아빠와 나예요."],
      ["무엇을 섞었나요?", ["달걀과 우유", "밥과 물", "차와 설탕", "빵과 소금"], 0, "eggs and milk를 섞었어요."],
      ["그릇을 어떻게 저었나요?", ["천천히", "빠르게", "세게", "안 저음"], 0, "slowly는 천천히예요."],
      ["팬케이크 색은 어떻게 변했나요?", ["검정", "노릇하게", "파랗게", "하얗게"], 1, "golden은 노릇한 색이에요."],
      ["위에 무엇을 올렸나요?", ["과일", "연필", "책", "종이"], 0, "fruit on top — 과일을 위에 올렸어요."],
    ],
  },
  {
    slug: "daily-29-the-small-science-fair",
    title: "The Small Science Fair",
    title_ko: "작은 과학 발표회",
    level: "A2",
    stage: 3,
    summary_ko: "간단한 씨앗 관찰 발표를 준비하며 이유, 순서, 관찰 표현을 A2 수준으로 익혀요.",
    P: [
      ["Our class has a small science fair today.", "오늘 우리 반에는 작은 과학 발표회가 있어요."],
      ["I bring a cup with three bean seeds.", "나는 콩 씨앗 세 개가 든 컵을 가져와요."],
      ["First, I show how the roots grew down.", "먼저 뿌리가 아래로 자란 모습을 보여줘요."],
      ["Then I explain why the leaves need light.", "그다음 잎이 왜 빛이 필요한지 설명해요."],
      ["My chart has pictures from each day.", "내 표에는 매일 찍은 사진이 있어요."],
      ["Some seeds grew faster than the others.", "어떤 씨앗은 다른 씨앗보다 더 빨리 자랐어요."],
      ["My teacher says my notes are clear.", "선생님은 내 기록이 분명하다고 말해요."],
      ["I feel like a real young scientist.", "나는 진짜 어린 과학자가 된 것 같아요."],
    ],
    Q: [
      ["무슨 행사가 있었나요?", ["과학 발표회", "운동회", "생일잔치", "소풍"], 0, "science fair는 과학 발표회예요."],
      ["컵 안에는 무엇이 있었나요?", ["콩 씨앗", "돌", "연필", "꽃잎"], 0, "three bean seeds가 있었어요."],
      ["뿌리는 어느 방향으로 자랐나요?", ["위", "아래", "옆", "동그랗게"], 1, "roots grew down — 아래로 자랐어요."],
      ["잎에는 무엇이 필요했나요?", ["빛", "신발", "소금", "장난감"], 0, "leaves need light — 잎은 빛이 필요해요."],
      ["선생님은 기록이 어떻다고 했나요?", ["분명하다", "너무 길다", "없다", "틀렸다"], 0, "notes are clear — 기록이 분명해요."],
    ],
  },
  {
    slug: "daily-30-a-thank-you-card",
    title: "A Thank-You Card",
    title_ko: "고마움 카드",
    level: "A2",
    stage: 3,
    summary_ko: "친절한 경비원 아저씨에게 감사 카드를 쓰며 감정과 이유를 연결하는 문장을 배워요.",
    P: [
      ["Mr. Park always smiles at our gate.", "박 아저씨는 늘 우리 문 앞에서 웃어 주세요."],
      ["He helps us cross the street safely.", "아저씨는 우리가 안전하게 길을 건너도록 도와주세요."],
      ["I want to make him a thank-you card.", "나는 아저씨께 감사 카드를 만들고 싶어요."],
      ["I draw our school and the bright crosswalk.", "나는 우리 학교와 밝은 횡단보도를 그려요."],
      ["Inside, I write, \"Thank you for helping us.\"", "안에는 \"도와주셔서 감사합니다\"라고 써요."],
      ["My classmates add their names too.", "반 친구들도 자기 이름을 더해요."],
      ["When we give him the card, he laughs softly.", "우리가 카드를 드리자 아저씨가 부드럽게 웃으세요."],
      ["Kind words can make a big day brighter.", "다정한 말은 하루를 더 밝게 만들 수 있어요."],
    ],
    Q: [
      ["박 아저씨는 어디에 계셨나요?", ["문 앞", "도서관", "운동장", "식당"], 0, "at our gate — 우리 문 앞이에요."],
      ["아저씨는 무엇을 도와주셨나요?", ["길 건너기", "요리", "수영", "그림"], 0, "cross the street safely — 안전하게 길 건너기예요."],
      ["나는 무엇을 만들고 싶었나요?", ["감사 카드", "가방", "케이크", "모자"], 0, "thank-you card는 감사 카드예요."],
      ["카드 안에는 어떤 말을 썼나요?", ["고맙습니다", "미안합니다", "잘 가요", "안녕"], 0, "Thank you for helping us."],
      ["카드를 받은 아저씨는 어떻게 했나요?", ["부드럽게 웃음", "울음", "달림", "잠"], 0, "he laughs softly — 부드럽게 웃으셨어요."],
    ],
  },
  {
    slug: "daily-31-the-bike-ride",
    title: "The Bike Ride",
    title_ko: "자전거 타는 날",
    level: "A2",
    stage: 4,
    summary_ko: "새 자전거를 타며 안전 규칙, 순서, 작은 문제 해결을 더 긴 흐름으로 익혀요.",
    P: [
      ["This morning, I practice riding my new bike.", "오늘 아침 나는 새 자전거 타는 연습을 해요."],
      ["Mom checks my helmet before we leave.", "출발하기 전에 엄마가 내 헬멧을 확인해요."],
      ["At first, the path feels narrow and bumpy.", "처음에는 길이 좁고 울퉁불퉁하게 느껴져요."],
      ["I keep both hands on the handles.", "나는 양손을 손잡이에 둬요."],
      ["A small stone makes my wheel shake.", "작은 돌 때문에 바퀴가 흔들려요."],
      ["I slow down instead of stopping suddenly.", "나는 갑자기 멈추지 않고 속도를 줄여요."],
      ["Mom tells me that careful riders stay safe.", "엄마는 조심하는 사람이 안전하다고 말해요."],
      ["Soon I ride all the way around the park.", "곧 나는 공원을 한 바퀴 끝까지 돌아요."],
      ["My legs are tired, but my smile is wide.", "다리는 피곤하지만 내 미소는 커요."],
    ],
    Q: [
      ["무엇을 연습했나요?", ["자전거 타기", "피아노", "수영", "달리기"], 0, "riding my new bike — 새 자전거 타기예요."],
      ["출발 전 엄마가 확인한 것은?", ["헬멧", "가방", "양말", "책"], 0, "helmet은 헬멧이에요."],
      ["처음 길은 어떻게 느껴졌나요?", ["좁고 울퉁불퉁함", "넓고 부드러움", "젖음", "어두움"], 0, "narrow and bumpy예요."],
      ["바퀴를 흔든 것은 무엇인가요?", ["작은 돌", "물", "장갑", "빵"], 0, "a small stone이 바퀴를 흔들었어요."],
      ["갑자기 멈추는 대신 무엇을 했나요?", ["속도를 줄임", "소리침", "뛰어내림", "눈 감음"], 0, "slow down — 속도를 줄였어요."],
    ],
  },
  {
    slug: "daily-32-the-new-neighbor",
    title: "The New Neighbor",
    title_ko: "새 이웃",
    level: "A2",
    stage: 4,
    summary_ko: "새로 이사 온 이웃을 도우며 소개, 초대, 배려 표현을 단계 4 분량으로 연습해요.",
    P: [
      ["A moving truck stops in front of our building.", "이삿짐 트럭이 우리 건물 앞에 멈춰요."],
      ["A new girl stands beside many boxes.", "새로 온 여자아이가 많은 상자 옆에 서 있어요."],
      ["She looks shy, so I wave first.", "그 아이가 수줍어 보여서 내가 먼저 손을 흔들어요."],
      ["Her name is Hana, and she likes drawing.", "그 아이의 이름은 하나이고 그림 그리기를 좋아해요."],
      ["I help carry a light box to the door.", "나는 가벼운 상자를 문까지 옮기는 걸 도와요."],
      ["Later, I show her the small playground.", "나중에 나는 하나에게 작은 놀이터를 보여줘요."],
      ["We draw a map of our street together.", "우리는 함께 우리 거리 지도를 그려요."],
      ["Hana says the new place feels warmer now.", "하나는 새 동네가 이제 더 따뜻하게 느껴진다고 말해요."],
      ["I am happy our building has a new friend.", "우리 건물에 새 친구가 생겨서 기뻐요."],
    ],
    Q: [
      ["무엇이 건물 앞에 멈췄나요?", ["이삿짐 트럭", "소방차", "버스", "택시"], 0, "moving truck은 이삿짐 트럭이에요."],
      ["새 이웃의 이름은 무엇인가요?", ["하나", "미나", "수지", "지우"], 0, "Her name is Hana."],
      ["하나는 무엇을 좋아했나요?", ["그림 그리기", "축구", "요리", "노래"], 0, "likes drawing — 그림 그리기를 좋아해요."],
      ["나는 무엇을 도왔나요?", ["가벼운 상자 옮기기", "차 고치기", "음식 사기", "숙제"], 0, "carry a light box예요."],
      ["둘이 함께 그린 것은?", ["거리 지도", "바다", "케이크", "시계"], 0, "a map of our street — 거리 지도예요."],
    ],
  },
  {
    slug: "daily-33-the-community-garden",
    title: "The Community Garden",
    title_ko: "함께 가꾸는 정원",
    level: "B1",
    stage: 5,
    summary_ko: "동네 사람들이 함께 정원을 만들며 역할 분담, 협동, 결과를 더 풍부한 B1 문장으로 익혀요.",
    P: [
      ["Our neighborhood decides to make an empty lot into a community garden.", "우리 동네는 빈터를 함께 가꾸는 정원으로 만들기로 해요."],
      ["At first, the ground is dry, hard, and full of weeds.", "처음에는 땅이 마르고 딱딱하며 잡초가 가득해요."],
      ["Each family brings something useful, such as gloves, seeds, or old buckets.", "각 가족은 장갑, 씨앗, 낡은 양동이처럼 쓸모 있는 것을 가져와요."],
      ["I work with Hana to pull weeds from the corner near the wall.", "나는 하나와 함께 담장 근처 모서리에서 잡초를 뽑아요."],
      ["Grandpa shows us how to make straight rows before planting.", "할아버지는 심기 전에 곧은 줄을 만드는 법을 보여주세요."],
      ["By lunchtime, tiny green plants are resting in the fresh soil.", "점심때가 되자 작은 초록 식물들이 새 흙 안에 자리 잡아요."],
      ["A neighbor paints signs so everyone knows where the tomatoes will grow.", "이웃 한 분은 토마토가 어디서 자랄지 모두 알도록 표지판을 칠해요."],
      ["When rain begins, nobody complains because the garden needs water.", "비가 내리기 시작해도 정원에는 물이 필요하므로 아무도 불평하지 않아요."],
      ["A week later, new leaves make the empty lot look alive.", "일주일 뒤 새 잎들이 빈터를 살아 있는 곳처럼 보이게 해요."],
      ["I learn that a shared place grows better when many hands care for it.", "함께 쓰는 공간은 여러 손이 돌볼 때 더 잘 자란다는 걸 배워요."],
    ],
    Q: [
      ["동네는 빈터를 무엇으로 만들기로 했나요?", ["공동 정원", "주차장", "운동장", "가게"], 0, "community garden은 함께 가꾸는 정원이에요."],
      ["처음 땅은 어떤 상태였나요?", ["마르고 딱딱함", "부드럽고 촉촉함", "눈으로 덮임", "물이 가득함"], 0, "dry, hard, and full of weeds예요."],
      ["각 가족이 가져온 물건 예시는?", ["장갑과 씨앗", "텔레비전", "의자만", "악기"], 0, "gloves, seeds, buckets를 가져왔어요."],
      ["비가 와도 불평하지 않은 이유는?", ["정원에 물이 필요해서", "집에 가고 싶어서", "우산이 없어서", "노래하려고"], 0, "the garden needs water."],
      ["화자가 배운 것은?", ["함께 돌보면 더 잘 자람", "혼자 해야 함", "식물은 자라지 않음", "비는 나쁨"], 0, "many hands care for it — 여러 손이 돌보는 힘이에요."],
    ],
  },
  {
    slug: "daily-34-the-museum-mystery",
    title: "The Museum Mystery",
    title_ko: "박물관의 작은 수수께끼",
    level: "B1",
    stage: 5,
    summary_ko: "박물관 견학 중 사라진 전시 카드의 단서를 찾으며 관찰, 추론, 질문 표현을 익혀요.",
    P: [
      ["Our class visits the city museum on a quiet Wednesday morning.", "우리 반은 조용한 수요일 아침에 시립 박물관을 방문해요."],
      ["The guide gives each group a card with three questions to answer.", "안내 선생님은 각 모둠에 답해야 할 질문 세 개가 적힌 카드를 줘요."],
      ["My group starts near a glass case filled with old coins.", "우리 모둠은 오래된 동전이 든 유리 전시함 근처에서 시작해요."],
      ["Suddenly, our question card slips from Min's folder and disappears.", "갑자기 우리 질문 카드가 민이의 폴더에서 미끄러져 사라져요."],
      ["We do not panic; instead, we look carefully along the floor.", "우리는 당황하지 않고 바닥을 따라 조심스럽게 살펴봐요."],
      ["I notice a corner of yellow paper under the bench.", "나는 벤치 아래에 노란 종이 모서리가 보이는 걸 알아차려요."],
      ["The card is there, but a new clue is written on the back.", "카드는 거기 있었지만 뒷면에 새 단서가 적혀 있어요."],
      ["It says, \"Find the oldest tool in this room.\"", "거기에는 \"이 방에서 가장 오래된 도구를 찾으세요\"라고 쓰여 있어요."],
      ["Following the clue helps us answer the final question faster.", "그 단서를 따라가자 마지막 질문에 더 빨리 답할 수 있어요."],
      ["The guide smiles because we solved the museum mystery together.", "안내 선생님은 우리가 함께 박물관 수수께끼를 풀어서 미소 지어요."],
    ],
    Q: [
      ["어디를 방문했나요?", ["시립 박물관", "병원", "공항", "도서관"], 0, "city museum은 시립 박물관이에요."],
      ["각 모둠은 무엇을 받았나요?", ["질문 카드", "도시락", "모자", "지도만"], 0, "a card with three questions예요."],
      ["질문 카드는 어디서 사라졌나요?", ["민이의 폴더", "가방", "책상", "창문"], 0, "from Min's folder예요."],
      ["노란 종이는 어디에 있었나요?", ["벤치 아래", "천장", "문밖", "유리 안"], 0, "under the bench예요."],
      ["카드 뒷면의 단서는 무엇을 찾으라고 했나요?", ["가장 오래된 도구", "가장 큰 그림", "출구", "점심"], 0, "the oldest tool을 찾으라고 했어요."],
    ],
  },
  {
    slug: "daily-35-the-school-news-team",
    title: "The School News Team",
    title_ko: "학교 뉴스 팀",
    level: "B1",
    stage: 5,
    summary_ko: "학교 뉴스 영상을 만들며 인터뷰, 편집, 역할 조율을 학습자 친화적인 B1 흐름으로 배워요.",
    P: [
      ["Our teacher chooses four students to make the Friday school news.", "선생님은 금요일 학교 뉴스를 만들 학생 네 명을 뽑아요."],
      ["I become the reporter, so I must ask clear and friendly questions.", "나는 기자가 되어 분명하고 다정한 질문을 해야 해요."],
      ["Sora holds the tablet carefully while Min checks the sound.", "소라는 태블릿을 조심히 들고 민이는 소리를 확인해요."],
      ["We interview the librarian about the new reading corner.", "우리는 새 독서 공간에 대해 사서 선생님을 인터뷰해요."],
      ["At first, my voice shakes, but I remember to breathe slowly.", "처음에는 목소리가 떨리지만 천천히 숨 쉬는 걸 떠올려요."],
      ["The librarian explains that students can read there during lunch.", "사서 선생님은 학생들이 점심시간에 그곳에서 읽을 수 있다고 설명해요."],
      ["After filming, we choose the best parts and cut the noisy pieces.", "촬영 후 우리는 가장 좋은 부분을 고르고 시끄러운 부분을 잘라요."],
      ["Our video is short, but it tells the important news clearly.", "우리 영상은 짧지만 중요한 소식을 분명히 전해요."],
      ["When the class watches it, everyone cheers for the news team.", "반 친구들이 영상을 볼 때 모두 뉴스 팀을 응원해요."],
      ["I learn that speaking well begins with listening carefully.", "말을 잘하는 일은 잘 듣는 것에서 시작된다는 걸 배워요."],
    ],
    Q: [
      ["학생들은 무엇을 만들었나요?", ["학교 뉴스", "케이크", "과학 모형", "운동장"], 0, "school news를 만들었어요."],
      ["화자는 어떤 역할이었나요?", ["기자", "요리사", "선수", "화가"], 0, "I become the reporter."],
      ["누구를 인터뷰했나요?", ["사서 선생님", "의사", "경찰", "운전사"], 0, "the librarian을 인터뷰했어요."],
      ["처음 목소리는 어땠나요?", ["떨림", "너무 큼", "없음", "노래함"], 0, "my voice shakes — 목소리가 떨렸어요."],
      ["말을 잘하는 일은 무엇에서 시작한다고 배웠나요?", ["잘 듣기", "빨리 달리기", "크게 웃기", "혼자 말하기"], 0, "listening carefully에서 시작돼요."],
    ],
  },
  {
    slug: "daily-36-the-market-project",
    title: "The Market Project",
    title_ko: "시장 조사 프로젝트",
    level: "B1",
    stage: 5,
    summary_ko: "시장 조사 프로젝트를 통해 가격 비교, 질문, 정리 발표를 풍부한 생활영어로 익혀요.",
    P: [
      ["For our math project, we visit the market to compare fruit prices.", "수학 프로젝트를 위해 우리는 과일 가격을 비교하러 시장에 가요."],
      ["Each pair chooses two fruits and writes the prices in a notebook.", "각 짝은 과일 두 가지를 고르고 가격을 공책에 적어요."],
      ["I choose apples because they are sold in many different stalls.", "나는 사과가 여러 가게에서 팔리기 때문에 사과를 골라요."],
      ["Some apples are cheap, but others look fresher and cost more.", "어떤 사과는 싸지만 다른 사과는 더 신선해 보이고 더 비싸요."],
      ["We ask the seller why the prices are not the same.", "우리는 왜 가격이 같지 않은지 판매자에게 물어요."],
      ["She says size, taste, and season can all change the price.", "판매자는 크기, 맛, 계절이 모두 가격을 바꿀 수 있다고 말해요."],
      ["Back at school, we make a chart with colors and numbers.", "학교로 돌아와 우리는 색깔과 숫자가 있는 표를 만들어요."],
      ["My partner explains the cheap apples, and I explain the fresh ones.", "짝은 싼 사과를 설명하고 나는 신선한 사과를 설명해요."],
      ["Our class learns that the lowest price is not always the best choice.", "우리 반은 가장 낮은 가격이 항상 최고의 선택은 아니라는 걸 배워요."],
      ["Now I can shop more carefully with my family.", "이제 나는 가족과 더 신중하게 장을 볼 수 있어요."],
    ],
    Q: [
      ["무엇을 비교하러 시장에 갔나요?", ["과일 가격", "신발 크기", "책 제목", "버스 시간"], 0, "fruit prices를 비교했어요."],
      ["화자는 어떤 과일을 골랐나요?", ["사과", "바나나", "포도", "딸기"], 0, "I choose apples."],
      ["판매자는 무엇이 가격을 바꿀 수 있다고 했나요?", ["크기, 맛, 계절", "색연필", "날씨만", "노래"], 0, "size, taste, and season이에요."],
      ["학교로 돌아와 만든 것은?", ["표", "배", "모자", "쿠키"], 0, "make a chart — 표를 만들어요."],
      ["가장 낮은 가격은 항상 최고인가요?", ["아니요", "네", "언제나", "모름"], 0, "not always the best choice예요."],
    ],
  },
  {
    slug: "daily-37-the-river-clean-up",
    title: "The River Clean-Up",
    title_ko: "강가 청소 날",
    level: "B1",
    stage: 6,
    summary_ko: "강가 청소 봉사에서 문제 원인과 해결 과정을 두 문장 페이지로 읽는 고분량 단계 6 그림책이에요.",
    P: [
      ["Our class joins a river clean-up on Saturday morning. We meet near the bridge with gloves and large bags.", "우리 반은 토요일 아침 강가 청소에 참여해요. 우리는 장갑과 큰 봉투를 들고 다리 근처에 모여요."],
      ["The river looks peaceful from far away. However, small pieces of plastic are caught between the stones.", "멀리서 보면 강은 평화로워 보여요. 하지만 작은 플라스틱 조각들이 돌 사이에 걸려 있어요."],
      ["Our teacher reminds us to move slowly and stay together. Safety matters more than finishing quickly.", "선생님은 천천히 움직이고 함께 있으라고 알려주세요. 빨리 끝내는 것보다 안전이 더 중요해요."],
      ["I pick up bottle caps, snack wrappers, and a broken toy wheel. Each tiny thing makes my bag heavier.", "나는 병뚜껑, 과자 봉지, 부서진 장난감 바퀴를 주워요. 작은 것 하나하나가 내 봉투를 더 무겁게 해요."],
      ["Mina finds a fishing line tangled around a branch. We call an adult because it is hard to remove.", "미나는 나뭇가지에 엉킨 낚싯줄을 찾아요. 빼기 어려워서 우리는 어른을 불러요."],
      ["After an hour, the path beside the water looks cleaner. Birds return to the quiet stones near the bank.", "한 시간이 지나자 물가 옆 길이 더 깨끗해 보여요. 새들이 둑 근처 조용한 돌 위로 돌아와요."],
      ["We sort the trash into plastic, paper, and metal piles. Sorting takes time, but it helps people recycle correctly.", "우리는 쓰레기를 플라스틱, 종이, 금속 더미로 나눠요. 분류에는 시간이 걸리지만 올바른 재활용에 도움이 돼요."],
      ["At lunch, my arms feel tired from carrying the bag. Still, I feel proud when I look at the clear path.", "점심때 내 팔은 봉투를 들어서 피곤해요. 그래도 깨끗한 길을 보니 자랑스러워요."],
      ["The volunteer leader explains that trash often travels from streets to rivers. I realize our small habits can reach far places.", "봉사 리더는 쓰레기가 거리에서 강으로 이동하는 경우가 많다고 설명해요. 나는 우리의 작은 습관이 먼 곳까지 닿을 수 있음을 깨달아요."],
      ["Before we leave, we take a class photo by the bridge. The river behind us shines in the afternoon light.", "떠나기 전에 우리는 다리 옆에서 반 사진을 찍어요. 우리 뒤의 강은 오후 햇빛에 빛나요."],
      ["I promise to use my lunch box instead of extra plastic bags. It is a small promise, but it is a real start.", "나는 여분의 비닐봉지 대신 도시락통을 쓰겠다고 약속해요. 작은 약속이지만 진짜 시작이에요."],
      ["On Monday, I tell my family what I learned. Clean places stay clean when people care every day.", "월요일에 나는 가족에게 배운 것을 말해요. 깨끗한 곳은 사람들이 매일 돌볼 때 깨끗하게 남아요."],
    ],
    Q: [
      ["반은 어떤 활동에 참여했나요?", ["강가 청소", "요리 수업", "영화 보기", "쇼핑"], 0, "river clean-up은 강가 청소 활동이에요."],
      ["강가에서 발견한 문제는 무엇인가요?", ["플라스틱 조각", "새 책", "새 의자", "깨끗한 물만"], 0, "plastic pieces가 돌 사이에 있었어요."],
      ["낚싯줄은 어디에 엉켜 있었나요?", ["나뭇가지", "가방", "모자", "책상"], 0, "around a branch — 나뭇가지에 엉켰어요."],
      ["쓰레기를 어떻게 나누었나요?", ["플라스틱, 종이, 금속", "색깔만", "크기만", "아무렇게나"], 0, "recycle correctly를 위해 분류했어요."],
      ["화자가 약속한 것은?", ["도시락통 쓰기", "강에 쓰레기 버리기", "늦게 자기", "봉투 더 쓰기"], 0, "use my lunch box라고 약속했어요."],
      ["깨끗한 곳은 언제 깨끗하게 남나요?", ["사람들이 매일 돌볼 때", "아무도 보지 않을 때", "비가 오지 않을 때만", "사진 찍을 때"], 0, "people care every day."],
    ],
  },
  {
    slug: "daily-38-the-robot-helper",
    title: "The Robot Helper",
    title_ko: "도와주는 로봇",
    level: "B1",
    stage: 6,
    summary_ko: "학교 발명 주간에 로봇을 설계하며 실패, 수정, 협업 과정을 긴 단계 6 문장으로 읽어요.",
    P: [
      ["During invention week, our team decides to build a small helper robot. We want it to carry pencils across the table.", "발명 주간 동안 우리 팀은 작은 도움 로봇을 만들기로 해요. 우리는 로봇이 책상 위에서 연필을 옮기길 원해요."],
      ["The first design looks exciting in our notebook. However, the wheels are too weak to move the pencil box.", "첫 설계는 공책에서 멋져 보여요. 하지만 바퀴가 너무 약해서 연필통을 움직일 수 없어요."],
      ["Instead of giving up, we test each part again. Min checks the wheels while Sora measures the box.", "포기하는 대신 우리는 각 부품을 다시 시험해요. 민이는 바퀴를 확인하고 소라는 상자를 재요."],
      ["I notice that the robot turns better when the load is lighter. We remove extra decorations from the top.", "나는 짐이 가벼울 때 로봇이 더 잘 돈다는 걸 알아차려요. 우리는 위쪽의 불필요한 장식을 떼어내요."],
      ["Our teacher asks us to explain the problem before changing the design. That makes our ideas clearer.", "선생님은 설계를 바꾸기 전에 문제를 설명하라고 하세요. 그러자 우리의 생각이 더 분명해져요."],
      ["We replace the small wheels with wider ones from an old toy car. The robot finally rolls forward without shaking.", "우리는 작은 바퀴를 오래된 장난감 자동차의 넓은 바퀴로 바꿔요. 로봇은 마침내 흔들리지 않고 앞으로 굴러가요."],
      ["The next problem is steering around a stack of books. We build a simple cardboard ramp to guide it.", "다음 문제는 책 더미를 피해 방향을 잡는 것이에요. 우리는 로봇을 안내할 간단한 종이 경사로를 만들어요."],
      ["When the robot carries three pencils, everyone holds their breath. It moves slowly, but it does not drop them.", "로봇이 연필 세 자루를 옮길 때 모두가 숨을 죽여요. 로봇은 천천히 움직이지만 떨어뜨리지 않아요."],
      ["On presentation day, our robot is not the fastest machine in the room. Still, it solves the task we chose.", "발표 날 우리 로봇은 교실에서 가장 빠른 기계는 아니에요. 그래도 우리가 고른 과제를 해결해요."],
      ["We show our failed drawings next to the final model. The class can see how each mistake taught us something.", "우리는 최종 모형 옆에 실패한 그림들도 보여줘요. 반 친구들은 각 실수가 우리에게 무언가를 가르쳤다는 걸 볼 수 있어요."],
      ["I used to think inventors had perfect ideas at once. Now I know they improve ideas by testing them.", "나는 예전에는 발명가가 한 번에 완벽한 생각을 한다고 여겼어요. 이제는 시험하며 생각을 개선한다는 걸 알아요."],
      ["After school, I write a new plan for a robot that waters plants. The next invention begins with another question.", "방과 후 나는 식물에 물을 주는 로봇 계획을 새로 써요. 다음 발명은 또 다른 질문에서 시작돼요."],
    ],
    Q: [
      ["팀은 무엇을 만들기로 했나요?", ["도움 로봇", "케이크", "연극 무대", "축구공"], 0, "helper robot을 만들기로 했어요."],
      ["첫 설계의 문제는?", ["바퀴가 너무 약함", "너무 작게 그림", "색이 없음", "소리가 큼"], 0, "wheels are too weak예요."],
      ["로봇이 더 잘 돌게 하려고 무엇을 제거했나요?", ["불필요한 장식", "바퀴", "연필", "상자"], 0, "extra decorations를 제거했어요."],
      ["작은 바퀴를 무엇으로 바꾸었나요?", ["넓은 바퀴", "종이", "지우개", "끈"], 0, "wider ones로 바꾸었어요."],
      ["발표 때 실패한 그림도 보여준 이유는?", ["실수에서 배운 과정을 보여주려고", "숨기려고", "시간을 줄이려고", "웃기려고"], 0, "each mistake taught us something."],
      ["화자가 발명에 대해 새로 알게 된 것은?", ["시험하며 개선한다", "항상 처음부터 완벽하다", "혼자만 해야 한다", "질문이 필요 없다"], 0, "improve ideas by testing them."],
    ],
  },
  {
    slug: "daily-39-the-weather-station",
    title: "The Weather Station",
    title_ko: "날씨 관찰소",
    level: "B1",
    stage: 6,
    summary_ko: "반 친구들이 날씨 관찰소를 만들고 데이터를 읽으며 예측과 근거 표현을 긴 문장으로 연습해요.",
    P: [
      ["Our class builds a weather station beside the classroom window. It has a thermometer, a rain cup, and a wind ribbon.", "우리 반은 교실 창문 옆에 날씨 관찰소를 만들어요. 거기에는 온도계, 빗물 컵, 바람 리본이 있어요."],
      ["Every morning, two students record the temperature before lessons begin. We write the numbers on a large calendar.", "매일 아침 학생 두 명이 수업 시작 전에 온도를 기록해요. 우리는 큰 달력에 숫자를 적어요."],
      ["At first, the numbers seem like a long list without meaning. Then our teacher asks us to look for patterns.", "처음에는 숫자들이 의미 없는 긴 목록처럼 보여요. 그러자 선생님은 규칙을 찾아보라고 하세요."],
      ["I notice that cloudy mornings are often cooler than bright mornings. Mina notices that windy days dry the playground faster.", "나는 흐린 아침이 밝은 아침보다 자주 더 시원하다는 걸 알아차려요. 미나는 바람 부는 날 운동장이 더 빨리 마른다는 걸 알아차려요."],
      ["On Wednesday, dark clouds gather before lunch. Our chart says rain often comes after three cool mornings.", "수요일 점심 전 어두운 구름이 모여요. 우리 표는 시원한 아침이 세 번 이어진 뒤 비가 자주 온다고 말해요."],
      ["We predict that rain will fall before the final bell. Some classmates disagree because the sky is still dry.", "우리는 마지막 종이 울리기 전에 비가 올 거라고 예측해요. 하늘이 아직 말라 보여서 몇몇 친구들은 동의하지 않아요."],
      ["During reading time, tiny drops begin tapping the window. The class turns toward our weather station in surprise.", "읽기 시간에 작은 물방울들이 창문을 두드리기 시작해요. 반 친구들은 놀라서 우리 날씨 관찰소 쪽을 봐요."],
      ["Our prediction was not magic; it came from careful records. That makes the rain feel even more exciting.", "우리의 예측은 마법이 아니었어요. 조심스러운 기록에서 나온 것이었어요. 그래서 비가 더 신나게 느껴져요."],
      ["The next week, we add a question box under the chart. Students write what they wonder about clouds and wind.", "다음 주 우리는 표 아래에 질문 상자를 더해요. 학생들은 구름과 바람에 대해 궁금한 것을 적어요."],
      ["One question asks why the wind changes direction so quickly. We decide to observe the ribbon at different times.", "한 질문은 왜 바람 방향이 그렇게 빨리 바뀌는지 물어요. 우리는 다른 시간에 리본을 관찰하기로 해요."],
      ["By the end of the month, our calendar is full of colors and notes. Weather no longer feels random to me.", "월말이 되자 우리 달력은 색과 기록으로 가득 차요. 날씨는 더 이상 나에게 무작위처럼 느껴지지 않아요."],
      ["I learn that good questions can turn an ordinary window into a place for discovery.", "좋은 질문은 평범한 창문도 발견의 장소로 바꿀 수 있다는 걸 배워요."],
    ],
    Q: [
      ["날씨 관찰소에는 무엇이 있었나요?", ["온도계, 빗물 컵, 바람 리본", "요리 도구", "책만", "운동화"], 0, "thermometer, rain cup, wind ribbon이에요."],
      ["매일 아침 무엇을 기록했나요?", ["온도", "점심 메뉴", "숙제", "책 제목"], 0, "record the temperature예요."],
      ["선생님은 무엇을 찾아보라고 했나요?", ["규칙", "모자", "연필", "문"], 0, "patterns는 규칙이에요."],
      ["비 예측은 무엇에서 나왔나요?", ["조심스러운 기록", "마법", "소문", "운"], 0, "careful records에서 나왔어요."],
      ["질문 상자에는 무엇을 적었나요?", ["구름과 바람에 대한 궁금증", "간식 목록", "노래 가사", "주소"], 0, "wonder about clouds and wind."],
      ["화자가 배운 것은?", ["좋은 질문이 발견을 만든다", "날씨는 항상 같다", "기록은 필요 없다", "창문은 쓸모없다"], 0, "good questions can turn... into discovery."],
    ],
  },
  {
    slug: "daily-40-the-little-library-plan",
    title: "The Little Library Plan",
    title_ko: "작은 도서관 계획",
    level: "B1",
    stage: 6,
    summary_ko: "동네 작은 도서관을 기획하고 실행하며 설득, 계획, 문제 해결을 가장 긴 단계 6 분량으로 읽어요.",
    P: [
      ["Our apartment lobby has an empty shelf near the mailboxes. Every day I pass it and imagine books waiting there.", "우리 아파트 로비에는 우편함 근처에 빈 선반이 있어요. 나는 매일 그곳을 지나며 책들이 기다리는 모습을 상상해요."],
      ["I ask the manager if children can use the shelf as a little library. He says we need a clear plan first.", "나는 관리인께 아이들이 그 선반을 작은 도서관으로 써도 되는지 물어요. 그는 먼저 분명한 계획이 필요하다고 말해요."],
      ["At home, I draw a sign that says people can take one book and leave one book. Mom helps me make the words polite.", "집에서 나는 한 권을 가져가고 한 권을 두라는 표지판을 그려요. 엄마는 말이 예의 바르게 들리도록 도와줘요."],
      ["The next day, I invite three neighbors to join a planning meeting. We sit on the lobby floor with paper and tape.", "다음 날 나는 이웃 세 명을 계획 모임에 초대해요. 우리는 종이와 테이프를 들고 로비 바닥에 앉아요."],
      ["Jin worries that the shelf may become messy after a week. We add a cleaning schedule so each family has a turn.", "진이는 일주일 뒤 선반이 지저분해질까 걱정해요. 우리는 각 가족이 차례를 맡도록 청소 일정을 더해요."],
      ["Sora suggests putting picture books on the lower shelf for younger children. Chapter books can stay higher where older readers can reach them.", "소라는 어린아이들을 위해 그림책을 낮은 칸에 두자고 제안해요. 글이 많은 책은 큰 독자가 닿을 수 있는 위쪽에 둘 수 있어요."],
      ["When we show the manager our plan, he reads every line carefully. Then he nods and gives us permission for one month.", "우리가 관리인께 계획을 보여드리자 그는 모든 줄을 조심히 읽어요. 그런 다음 고개를 끄덕이며 한 달 동안 허락해 주세요."],
      ["Opening day feels more important than I expected. Neighbors bring books with notes about why they loved them.", "개장 날은 내가 예상한 것보다 더 중요하게 느껴져요. 이웃들은 왜 그 책을 좋아했는지 적은 쪽지와 함께 책을 가져와요."],
      ["A small problem appears when two copies of the same book arrive. Instead of arguing, we decide to keep one and donate one to school.", "같은 책 두 권이 들어오자 작은 문제가 생겨요. 다투는 대신 우리는 한 권은 남기고 한 권은 학교에 기부하기로 해요."],
      ["During the first week, I see a shy kindergartener choose a bright picture book. Her brother reads the first page aloud.", "첫 주에 나는 수줍은 유치원생이 밝은 그림책을 고르는 걸 봐요. 그 아이의 오빠가 첫 페이지를 소리 내어 읽어요."],
      ["By the end of the month, the shelf is still neat and full. The manager says our plan worked because everyone shared responsibility.", "월말이 되어도 선반은 여전히 깔끔하고 가득 차 있어요. 관리인은 모두가 책임을 나누었기 때문에 계획이 성공했다고 말해요."],
      ["Now the little library belongs to the whole building. I learn that a good idea becomes real when people make room for it together.", "이제 작은 도서관은 건물 전체의 것이에요. 좋은 생각은 사람들이 함께 자리를 만들 때 현실이 된다는 걸 배워요."],
    ],
    Q: [
      ["빈 선반은 어디에 있었나요?", ["아파트 로비", "교실", "시장", "버스 안"], 0, "apartment lobby에 있었어요."],
      ["관리인은 무엇이 먼저 필요하다고 했나요?", ["분명한 계획", "비싼 책장", "음악", "간식"], 0, "a clear plan first예요."],
      ["표지판의 규칙은 무엇인가요?", ["한 권 가져가고 한 권 두기", "책 사기만", "아무것도 만지지 않기", "소리 지르기"], 0, "take one book and leave one book."],
      ["선반이 지저분해질 걱정을 해결한 방법은?", ["청소 일정 만들기", "선반 치우기", "문 잠그기", "책 버리기"], 0, "cleaning schedule을 만들었어요."],
      ["어린아이들을 위해 그림책은 어디에 두었나요?", ["낮은 칸", "가장 위", "밖", "상자 속"], 0, "lower shelf는 낮은 칸이에요."],
      ["계획이 성공한 이유는?", ["모두가 책임을 나눴기 때문", "한 사람만 했기 때문", "아무도 오지 않았기 때문", "책이 없었기 때문"], 0, "everyone shared responsibility."],
    ],
  },
];

function wordCount(text) {
  return text.match(/[A-Za-z']+/g)?.length ?? 0;
}

function validateBook(b) {
  const rule = RULES[b.stage];
  if (!rule) throw new Error(`${b.slug}: invalid stage ${b.stage}`);
  if (b.level !== rule.level) {
    throw new Error(`${b.slug}: level ${b.level} must be ${rule.level}`);
  }
  if (b.P.length !== rule.pages) {
    throw new Error(`${b.slug}: page count ${b.P.length} must be ${rule.pages}`);
  }
  const counts = b.P.map(([text]) => wordCount(text));
  const total = counts.reduce((sum, n) => sum + n, 0);
  return { counts, total, rule };
}

let made = 0;
for (const b of B) {
  const { counts, total, rule } = validateBook(b);
  const file = join(SEED, `${b.slug}.json`);
  if (existsSync(file) && !FORCE) {
    console.log(`↩︎ 이미 있음 ${b.slug}`);
    continue;
  }
  const obj = {
    slug: b.slug,
    title: b.title,
    title_ko: b.title_ko,
    level: b.level,
    ageBand: "8-10",
    stage: b.stage,
    collection: "daily",
    summary_ko: `${b.summary_ko} (${rule.label}, total ${total} words.)`,
    pages: b.P.map(([text, translation_ko]) => ({
      sentences: [{ text, translation_ko }],
    })),
    words: {},
    quiz: b.Q.map(([question_ko, options, answerIndex, explain_ko]) => ({
      question_ko,
      type: "mc",
      options,
      answerIndex,
      explain_ko,
    })),
  };
  writeFileSync(file, `${JSON.stringify(obj, null, 2)}\n`);
  made++;
  console.log(
    `✅ ${b.slug} stage${b.stage} ${b.level} · ${b.P.length}p · ${total} words · page words ${counts.join("/")}`,
  );
}

console.log(`\n생성/갱신 ${made}권 / 정의 ${B.length}권`);
