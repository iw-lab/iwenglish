/**
 * daily-41 ~ 50 — 50권 완성을 위한 10권(단계 분포 보강 8/8/8/8/9/9).
 * 검증된 스펙(쪽수·문장·분량·문법) 그대로. 음성/그림은 파이프라인에서 채움.
 *   node scripts/seed-books-41-50.mjs
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const SEED = join(process.cwd(), "data", "seed");
const LEVEL = { 1: "preA1", 2: "A1", 3: "A2", 4: "A2", 5: "B1", 6: "B1" };

const P = (text, ko) => ({ sentences: [{ text, translation_ko: ko }] });
const Q = (q, options, answerIndex, ex) => ({
  question_ko: q, type: "mc", options, answerIndex, explain_ko: ex,
});

const BOOKS = [
  // ───────── Stage 1 (preA1) ─────────
  {
    slug: "daily-41-my-lunchbox", title: "My Lunchbox", title_ko: "내 도시락", stage: 1,
    summary_ko: "도시락을 열어 음식을 하나씩 보여주며 가장 쉬운 명사와 표현을 반복해요.",
    pages: [
      P("This is my lunchbox.", "이건 내 도시락이에요."),
      P("I have rice.", "나는 밥이 있어요."),
      P("I have an egg.", "나는 달걀이 있어요."),
      P("I have a small apple.", "나는 작은 사과가 있어요."),
      P("The food smells good.", "음식 냄새가 좋아요."),
      P("I eat with my friend.", "나는 친구와 먹어요."),
    ],
    quiz: [
      Q("이건 무엇인가요?", ["도시락", "가방", "신발", "공"], 0, "lunchbox는 도시락이에요."),
      Q("도시락 안에 무엇이 있나요?", ["밥", "물", "책", "모자"], 0, "I have rice — 밥이 있어요."),
      Q("사과는 어땠나요?", ["작아요", "커요", "없어요", "빨개요만"], 0, "a small apple — 작은 사과예요."),
      Q("음식 냄새는 어땠나요?", ["좋아요", "이상해요", "안 나요", "매워요"], 0, "smells good — 냄새가 좋아요."),
      Q("누구와 먹나요?", ["친구", "혼자", "선생님만", "강아지"], 0, "with my friend — 친구와 먹어요."),
    ],
  },
  {
    slug: "daily-42-wash-my-hands", title: "Wash My Hands", title_ko: "손을 씻어요", stage: 1,
    summary_ko: "더러운 손을 비누로 깨끗이 씻는 과정을 짧은 문장으로 익혀요.",
    pages: [
      P("My hands are dirty.", "내 손은 더러워요."),
      P("I turn on the water.", "나는 물을 틀어요."),
      P("I use some soap.", "나는 비누를 써요."),
      P("I rub and rub.", "나는 비비고 또 비벼요."),
      P("I wash them clean.", "나는 깨끗하게 씻어요."),
      P("Now my hands are clean.", "이제 내 손은 깨끗해요."),
    ],
    quiz: [
      Q("처음에 손은 어땠나요?", ["더러워요", "깨끗해요", "따뜻해요", "차가워요"], 0, "dirty는 더럽다는 뜻이에요."),
      Q("무엇을 먼저 틀었나요?", ["물", "불", "라디오", "선풍기"], 0, "turn on the water — 물을 틀어요."),
      Q("무엇을 사용했나요?", ["비누", "치약", "기름", "소금"], 0, "soap는 비누예요."),
      Q("손을 어떻게 했나요?", ["비볐어요", "그렸어요", "숨겼어요", "묶었어요"], 0, "rub — 비벼요."),
      Q("마지막에 손은 어땠나요?", ["깨끗해요", "더러워요", "아파요", "젖은 채 그대로"], 0, "clean은 깨끗하다는 뜻이에요."),
    ],
  },
  // ───────── Stage 2 (A1) ─────────
  {
    slug: "daily-43-feeding-the-fish", title: "Feeding the Fish", title_ko: "물고기 밥 주기", stage: 2,
    summary_ko: "작은 어항의 물고기에게 밥을 주며 동사와 형용사를 간단한 문장으로 배워요.",
    pages: [
      P("I have a small fish tank.", "나는 작은 어항이 있어요."),
      P("Two orange fish swim inside.", "주황색 물고기 두 마리가 안에서 헤엄쳐요."),
      P("It is time to feed them.", "밥 줄 시간이에요."),
      P("I drop a little food in.", "나는 먹이를 조금 넣어요."),
      P("The fish swim up fast.", "물고기들이 빠르게 올라와요."),
      P("They eat every tiny bit.", "그들은 작은 알갱이까지 다 먹어요."),
      P("My fish are happy and full.", "내 물고기는 행복하고 배불러요."),
    ],
    quiz: [
      Q("나는 무엇을 가지고 있나요?", ["작은 어항", "강아지", "새장", "공"], 0, "a small fish tank — 작은 어항이에요."),
      Q("물고기는 몇 마리인가요?", ["두 마리", "한 마리", "다섯 마리", "없어요"], 0, "two fish — 두 마리예요."),
      Q("무엇을 넣었나요?", ["먹이", "돌", "물감", "모래"], 0, "food를 넣었어요."),
      Q("물고기는 어떻게 올라왔나요?", ["빠르게", "천천히", "거꾸로", "안 와요"], 0, "swim up fast — 빠르게요."),
      Q("마지막에 물고기는 어땠나요?", ["행복하고 배불러요", "배고파요", "아파요", "슬퍼요"], 0, "happy and full — 행복하고 배불러요."),
    ],
  },
  {
    slug: "daily-44-my-umbrella", title: "My Umbrella", title_ko: "내 우산", stage: 2,
    summary_ko: "비 오는 날 우산을 펴고 빗속을 걷는 모습을 쉬운 문장으로 그려요.",
    pages: [
      P("Dark clouds fill the gray sky.", "어두운 구름이 회색 하늘을 채워요."),
      P("Soon the rain starts to fall.", "곧 비가 내리기 시작해요."),
      P("I open my yellow umbrella.", "나는 노란 우산을 펴요."),
      P("The raindrops tap on top.", "빗방울이 위에서 톡톡 쳐요."),
      P("My shoes splash in puddles.", "내 신발이 웅덩이에서 첨벙거려요."),
      P("I stay warm and dry.", "나는 따뜻하고 보송해요."),
      P("Rainy days can be fun.", "비 오는 날도 즐거울 수 있어요."),
    ],
    quiz: [
      Q("하늘은 어땠나요?", ["어두운 구름", "맑은 별", "노을", "눈"], 0, "dark clouds — 어두운 구름이에요."),
      Q("무엇이 내리기 시작했나요?", ["비", "눈", "꽃잎", "낙엽"], 0, "rain — 비예요."),
      Q("우산은 무슨 색인가요?", ["노랑", "빨강", "파랑", "초록"], 0, "yellow umbrella — 노란 우산이에요."),
      Q("신발은 어디서 첨벙거렸나요?", ["웅덩이", "바다", "욕조", "강"], 0, "puddles — 웅덩이예요."),
      Q("나는 어떻게 지냈나요?", ["따뜻하고 보송해요", "젖었어요", "추워요", "아파요"], 0, "warm and dry — 따뜻하고 보송해요."),
    ],
  },
  // ───────── Stage 3 (A2) ─────────
  {
    slug: "daily-45-riding-the-subway", title: "Riding the Subway", title_ko: "지하철 타기", stage: 3,
    summary_ko: "엄마와 지하철을 타며 장소와 순서, 배려 표현을 한 문장씩 익혀요.",
    pages: [
      P("Today I ride the subway with Mom.", "오늘 나는 엄마와 지하철을 타요."),
      P("We tap our cards at the gate.", "우리는 개찰구에서 카드를 찍어요."),
      P("The train arrives with a loud hum.", "기차가 큰 소리를 내며 들어와요."),
      P("We find two empty seats and sit.", "우리는 빈자리 두 개를 찾아 앉아요."),
      P("I watch the dark tunnel rush by.", "나는 어두운 터널이 빠르게 지나가는 걸 봐요."),
      P("A kind man gives his seat to others.", "친절한 아저씨가 다른 사람에게 자리를 양보해요."),
      P("Mom says our stop is next.", "엄마가 다음이 우리 정거장이라고 말해요."),
      P("We step off and climb the stairs.", "우리는 내려서 계단을 올라가요."),
    ],
    quiz: [
      Q("누구와 지하철을 탔나요?", ["엄마", "친구", "선생님", "혼자"], 0, "with Mom — 엄마와 함께요."),
      Q("개찰구에서 무엇을 했나요?", ["카드를 찍었어요", "표를 버렸어요", "뛰었어요", "잤어요"], 0, "tap our cards — 카드를 찍어요."),
      Q("자리는 몇 개를 찾았나요?", ["두 개", "한 개", "다섯 개", "없어요"], 0, "two empty seats — 빈자리 두 개예요."),
      Q("친절한 아저씨는 무엇을 했나요?", ["자리를 양보했어요", "소리쳤어요", "잤어요", "내렸어요"], 0, "gives his seat — 자리를 양보해요."),
      Q("마지막에 무엇을 올라갔나요?", ["계단", "사다리", "언덕", "나무"], 0, "climb the stairs — 계단을 올라가요."),
    ],
  },
  {
    slug: "daily-46-the-class-pet", title: "The Class Pet", title_ko: "우리 반 햄스터", stage: 3,
    summary_ko: "우리 반 햄스터를 돌보는 차례를 맡아 돌봄과 순서 표현을 익혀요.",
    pages: [
      P("Our class has a small brown hamster.", "우리 반에는 작은 갈색 햄스터가 있어요."),
      P("His name is Mochi and he is soft.", "이름은 모찌이고 아주 보드라워요."),
      P("Today it is my turn to care for him.", "오늘은 내가 돌볼 차례예요."),
      P("I fill his bowl with fresh seeds.", "나는 그릇에 신선한 씨앗을 채워요."),
      P("He stuffs them into his round cheeks.", "모찌는 동그란 볼에 씨앗을 가득 넣어요."),
      P("Then I clean his little water bottle.", "그다음 나는 작은 물통을 닦아요."),
      P("Mochi runs fast on his spinning wheel.", "모찌는 쳇바퀴 위에서 빠르게 달려요."),
      P("Taking care of him makes me proud.", "그를 돌보는 일이 나를 자랑스럽게 해요."),
    ],
    quiz: [
      Q("우리 반 동물은 무엇인가요?", ["햄스터", "강아지", "고양이", "물고기"], 0, "hamster — 햄스터예요."),
      Q("햄스터의 이름은?", ["모찌", "초코", "별이", "콩이"], 0, "His name is Mochi."),
      Q("그릇에 무엇을 채웠나요?", ["신선한 씨앗", "물만", "흙", "종이"], 0, "fresh seeds — 신선한 씨앗이에요."),
      Q("씨앗을 어디에 넣었나요?", ["동그란 볼", "주머니", "상자", "신발"], 0, "round cheeks — 동그란 볼이에요."),
      Q("돌보는 일은 나를 어떻게 만들었나요?", ["자랑스럽게", "슬프게", "지치게", "화나게"], 0, "makes me proud — 자랑스럽게 해요."),
    ],
  },
  // ───────── Stage 4 (A2, 과거형·이유) ─────────
  {
    slug: "daily-47-the-spelling-test", title: "The Spelling Test", title_ko: "받아쓰기 시험", stage: 4,
    summary_ko: "어려운 받아쓰기 시험을 연습으로 준비한 과정을 과거형과 이유 표현으로 읽어요.",
    pages: [
      P("Last week I worried about the spelling test.", "지난주에 나는 받아쓰기 시험이 걱정됐어요."),
      P("Some words were long and very tricky.", "어떤 단어는 길고 아주 까다로웠어요."),
      P("So every night I practiced ten words.", "그래서 매일 밤 나는 단어 열 개를 연습했어요."),
      P("Mom read them aloud while I wrote.", "엄마가 소리 내어 읽고 나는 받아 적었어요."),
      P("When I made a mistake, I tried again.", "틀리면 나는 다시 시도했어요."),
      P("On test day my hands felt a little shaky.", "시험 날 내 손은 조금 떨렸어요."),
      P("But I remembered the words because I practiced.", "그래도 연습한 덕분에 단어가 기억났어요."),
      P("I spelled almost every word correctly.", "나는 거의 모든 단어를 맞게 썼어요."),
      P("I learned that practice makes hard things easier.", "나는 연습이 어려운 일을 쉽게 만든다는 걸 배웠어요."),
    ],
    quiz: [
      Q("지난주에 무엇이 걱정됐나요?", ["받아쓰기 시험", "소풍", "운동회", "발표회"], 0, "spelling test — 받아쓰기 시험이에요."),
      Q("매일 밤 무엇을 했나요?", ["단어 열 개 연습", "게임", "낮잠", "TV 보기"], 0, "practiced ten words — 단어 열 개를 연습했어요."),
      Q("엄마는 무엇을 했나요?", ["소리 내어 읽어 줬어요", "그림을 그렸어요", "노래했어요", "잤어요"], 0, "read them aloud — 소리 내어 읽어 줬어요."),
      Q("단어가 기억난 이유는?", ["연습했기 때문", "운이 좋아서", "쉬워서", "친구가 알려줘서"], 0, "because I practiced — 연습한 덕분이에요."),
      Q("무엇을 배웠나요?", ["연습이 어려운 일을 쉽게 만든다", "시험은 쉽다", "연습은 소용없다", "포기가 낫다"], 0, "practice makes hard things easier."),
    ],
  },
  {
    slug: "daily-48-a-rainy-recess", title: "A Rainy Recess", title_ko: "비 오는 쉬는 시간", stage: 4,
    summary_ko: "비로 밖에 못 나간 쉬는 시간이 즐거운 추억이 된 이야기를 과거형으로 읽어요.",
    pages: [
      P("We could not go outside because it rained.", "비가 와서 우리는 밖에 나갈 수 없었어요."),
      P("At first everyone felt a little bored.", "처음에는 모두 조금 지루해했어요."),
      P("Then our teacher opened a box of games.", "그때 선생님이 게임 상자를 열었어요."),
      P("My friends and I built a tall tower.", "친구들과 나는 높은 탑을 쌓았어요."),
      P("When it fell, we all laughed together.", "탑이 무너지자 우리는 다 같이 웃었어요."),
      P("Min drew a funny picture of our class.", "민이는 우리 반의 웃긴 그림을 그렸어요."),
      P("We shared crayons so everyone could join.", "우리는 크레용을 나눠 모두 함께할 수 있었어요."),
      P("Recess ended before we even noticed.", "쉬는 시간은 우리가 알아채기도 전에 끝났어요."),
      P("A rainy day became a happy memory.", "비 오는 날이 행복한 추억이 됐어요."),
    ],
    quiz: [
      Q("왜 밖에 못 나갔나요?", ["비가 와서", "추워서", "숙제 때문에", "문이 잠겨서"], 0, "because it rained — 비가 와서요."),
      Q("선생님은 무엇을 열었나요?", ["게임 상자", "창문", "도시락", "책가방"], 0, "a box of games — 게임 상자예요."),
      Q("친구들과 무엇을 쌓았나요?", ["높은 탑", "눈사람", "모래성", "담요"], 0, "a tall tower — 높은 탑이에요."),
      Q("민이는 무엇을 그렸나요?", ["우리 반의 웃긴 그림", "지도", "포스터", "만화책"], 0, "a funny picture of our class."),
      Q("비 오는 날은 결국 무엇이 됐나요?", ["행복한 추억", "지루한 하루", "슬픈 날", "긴 시험"], 0, "a happy memory — 행복한 추억이 됐어요."),
    ],
  },
  // ───────── Stage 5 (B1) ─────────
  {
    slug: "daily-49-the-recycling-project", title: "The Recycling Project", title_ko: "재활용 프로젝트", stage: 5,
    summary_ko: "한 달간 반 재활용 프로젝트를 이끌며 문제와 해결, 협동을 더 풍부한 문장으로 익혀요.",
    pages: [
      P("Our class started a recycling project for one whole month.", "우리 반은 한 달 내내 재활용 프로젝트를 시작했어요."),
      P("We placed three bins for paper, plastic, and cans.", "우리는 종이, 플라스틱, 캔을 위한 통 세 개를 놓았어요."),
      P("At first, people dropped trash into the wrong bins.", "처음에는 사람들이 엉뚱한 통에 쓰레기를 넣었어요."),
      P("So we drew clear pictures above each colorful bin.", "그래서 우리는 색색의 통 위에 분명한 그림을 그렸어요."),
      P("Slowly, my classmates began to sort more carefully.", "천천히 반 친구들이 더 조심스럽게 분리하기 시작했어요."),
      P("Every Friday we counted how much we had saved.", "매주 금요일 우리는 얼마나 모았는지 세어 봤어요."),
      P("The pile of clean paper grew taller each week.", "깨끗한 종이 더미는 매주 더 높이 쌓였어요."),
      P("We turned old boxes into pencil holders for art class.", "우리는 낡은 상자를 미술 시간용 연필꽂이로 만들었어요."),
      P("Our teacher said small habits can change a whole school.", "선생님은 작은 습관이 학교 전체를 바꿀 수 있다고 했어요."),
      P("I felt proud that we helped our planet together.", "우리가 함께 지구를 도왔다는 게 자랑스러웠어요."),
    ],
    quiz: [
      Q("프로젝트는 얼마 동안 했나요?", ["한 달", "하루", "일 년", "일주일"], 0, "for one whole month — 한 달 동안이에요."),
      Q("통은 몇 개를 놓았나요?", ["세 개", "한 개", "다섯 개", "열 개"], 0, "three bins — 통 세 개예요."),
      Q("처음의 문제는 무엇이었나요?", ["엉뚱한 통에 넣음", "통이 없음", "종이가 없음", "비가 옴"], 0, "wrong bins — 엉뚱한 통에 넣었어요."),
      Q("문제를 어떻게 해결했나요?", ["통 위에 그림을 그림", "통을 치움", "그만둠", "혼냄"], 0, "drew clear pictures — 분명한 그림을 그렸어요."),
      Q("낡은 상자는 무엇이 되었나요?", ["연필꽂이", "쓰레기", "의자", "책"], 0, "pencil holders — 연필꽂이가 됐어요."),
    ],
  },
  // ───────── Stage 6 (B1, 두 문장 페이지·복문) ─────────
  {
    slug: "daily-50-the-class-play", title: "The Class Play", title_ko: "학급 연극", stage: 6,
    summary_ko: "부끄럼 많던 아이가 학급 연극의 등대 역을 맡아 용기를 키워가는 가장 긴 단계 6 이야기예요.",
    pages: [
      P("Our class decided to put on a play about a brave little lighthouse. Everyone wanted a part, so we wrote extra roles together.",
        "우리 반은 용감한 작은 등대 이야기를 연극으로 하기로 했어요. 모두 역할을 원해서 우리는 함께 역할을 더 만들었어요."),
      P("I hoped to play the lighthouse, but I felt too shy to ask. When my friend Sora noticed, she gently pushed me to try.",
        "나는 등대 역을 맡고 싶었지만 너무 부끄러워 말을 못 했어요. 친구 소라가 알아채고 부드럽게 용기를 북돋아 줬어요."),
      P("During the first practice, I forgot almost all of my lines. My face turned red, and I wanted to hide backstage.",
        "첫 연습 때 나는 대사를 거의 다 잊어버렸어요. 얼굴이 빨개져서 무대 뒤로 숨고 싶었어요."),
      P("Instead of laughing, my classmates helped me read the script again. We practiced the hardest scene until it felt natural.",
        "친구들은 웃는 대신 나와 함께 대본을 다시 읽어 줬어요. 우리는 가장 어려운 장면을 자연스러워질 때까지 연습했어요."),
      P("Because we rehearsed every day, the words slowly became easy. I even started to enjoy standing in the bright center light.",
        "매일 연습한 덕분에 대사가 천천히 쉬워졌어요. 나는 밝은 가운데 조명 아래 서는 게 즐거워지기까지 했어요."),
      P("On the night of the show, the hall filled with quiet families. My heart pounded while I waited behind the heavy curtain.",
        "공연 날 밤, 강당은 조용한 가족들로 가득 찼어요. 무거운 막 뒤에서 기다리는 동안 내 심장이 쿵쿵 뛰었어요."),
      P("When the curtain rose, the bright lights felt warmer than before. I took a deep breath and spoke my very first line.",
        "막이 오르자 밝은 조명이 전보다 따뜻하게 느껴졌어요. 나는 깊게 숨을 쉬고 첫 대사를 말했어요."),
      P("Although I stumbled on one word, I kept going without stopping. The audience leaned in, listening to our small brave story.",
        "한 단어에서 더듬었지만 나는 멈추지 않고 계속했어요. 관객들이 몸을 기울이며 우리의 작고 용감한 이야기를 들었어요."),
      P("In the final scene, the lighthouse guided a lost ship safely home. The whole class shone our flashlights across the dark stage.",
        "마지막 장면에서 등대는 길 잃은 배를 안전하게 집으로 이끌었어요. 반 전체가 어두운 무대 위로 손전등을 비췄어요."),
      P("When we finished, the families stood up and clapped loudly. I had never heard a sound so wonderful in my life.",
        "우리가 끝내자 가족들이 일어서서 크게 박수쳤어요. 나는 살면서 그렇게 멋진 소리를 들어 본 적이 없었어요."),
      P("Backstage, Sora hugged me and said I had been truly brave. I realized that courage grows when good friends believe in you.",
        "무대 뒤에서 소라가 나를 안으며 정말 용감했다고 말했어요. 나는 좋은 친구가 믿어 줄 때 용기가 자란다는 걸 깨달았어요."),
      P("That night I kept the wrinkled script beside my pillow. It reminded me that the scariest tries often become the proudest memories.",
        "그날 밤 나는 구겨진 대본을 베개 옆에 두었어요. 그것은 가장 무서운 도전이 종종 가장 자랑스러운 추억이 된다는 걸 떠올리게 했어요."),
    ],
    quiz: [
      Q("연극의 주제는 무엇이었나요?", ["용감한 작은 등대", "큰 배", "마법사", "공룡"], 0, "a play about a brave little lighthouse."),
      Q("나는 처음에 왜 말을 못 했나요?", ["너무 부끄러워서", "아파서", "관심이 없어서", "시간이 없어서"], 0, "too shy to ask — 너무 부끄러워서요."),
      Q("첫 연습 때 무슨 일이 있었나요?", ["대사를 거의 잊었어요", "일등을 했어요", "넘어졌어요", "노래했어요"], 0, "forgot almost all of my lines."),
      Q("친구들은 웃는 대신 무엇을 했나요?", ["대본을 같이 읽어 줬어요", "놀렸어요", "나갔어요", "잤어요"], 0, "helped me read the script again."),
      Q("대사가 쉬워진 이유는?", ["매일 연습해서", "운이 좋아서", "짧아서", "포기해서"], 0, "Because we rehearsed every day."),
      Q("마지막에 무엇을 깨달았나요?", ["친구가 믿어 줄 때 용기가 자란다", "혼자가 낫다", "연극은 쉽다", "도전은 위험하다"], 0, "courage grows when good friends believe in you."),
    ],
  },
];

let n = 0;
for (const b of BOOKS) {
  const book = {
    slug: b.slug,
    title: b.title,
    title_ko: b.title_ko,
    level: LEVEL[b.stage],
    ageBand: "8-10",
    stage: b.stage,
    collection: "daily",
    summary_ko: b.summary_ko,
    pages: b.pages,
    words: {},
    quiz: b.quiz,
  };
  writeFileSync(join(SEED, `${b.slug}.json`), `${JSON.stringify(book, null, 2)}\n`);
  const words = b.pages.reduce(
    (s, p) => s + p.sentences.reduce((a, x) => a + (x.text.match(/[A-Za-z']+/g) || []).length, 0),
    0,
  );
  console.log(`✅ ${b.slug}  stage${b.stage} ${LEVEL[b.stage]}  ${b.pages.length}p ${words}w`);
  n++;
}
console.log(`\n${n}권 작성 완료 (daily-41~50) → 총 50권`);
