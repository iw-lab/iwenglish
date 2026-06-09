/**
 * 기존 daily-1 ~ daily-24의 단계/분량 보정.
 *
 * - stage별 CEFR 표기를 일관화한다.
 * - 기존 짧은 책에 후반 페이지를 추가해 6단계 분량 차이를 강화한다.
 * - 이미 추가된 페이지는 중복 삽입하지 않는다.
 *
 *   node scripts/rebalance-daily-stages.mjs
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SEED = join(process.cwd(), "data", "seed");
const LEVEL_BY_STAGE = {
  1: "preA1",
  2: "A1",
  3: "A2",
  4: "A2",
  5: "B1",
  6: "B1",
};

const APPENDS = {
  "daily-8-my-toys": {
    pages: [
      ["I put my toys back on the shelf.", "나는 장난감을 다시 선반에 올려요."],
    ],
    quiz: [
      ["장난감은 어디에 다시 두었나요?", ["선반", "창문", "냉장고", "신발장"], 0, "on the shelf — 선반 위예요."],
    ],
  },
  "daily-3-my-new-friend": {
    pages: [
      ["Now we sit together and read the same book.", "이제 우리는 함께 앉아 같은 책을 읽어요."],
    ],
    quiz: [
      ["새 친구와 무엇을 함께 읽었나요?", ["같은 책", "신문", "메뉴", "지도"], 0, "read the same book — 같은 책을 읽었어요."],
    ],
  },
  "daily-9-at-the-doctor": {
    pages: [
      ["The doctor says I should rest and drink warm water.", "의사 선생님은 쉬고 따뜻한 물을 마셔야 한다고 말해요."],
    ],
    quiz: [
      ["의사 선생님은 무엇을 마시라고 했나요?", ["따뜻한 물", "찬 주스", "커피", "우유만"], 0, "drink warm water — 따뜻한 물을 마셔요."],
    ],
  },
  "daily-4-lunch-time": {
    pages: [
      ["After lunch, I clean my tray and thank the cook.", "점심 뒤에 나는 식판을 정리하고 조리사님께 감사 인사를 해요."],
    ],
    quiz: [
      ["점심 뒤에 무엇을 정리했나요?", ["식판", "침대", "신발", "우산"], 0, "clean my tray — 식판을 정리해요."],
    ],
  },
  "daily-10-happy-birthday": {
    pages: [
      ["Before everyone goes home, we take a picture together.", "모두 집에 가기 전에 우리는 함께 사진을 찍어요."],
    ],
    quiz: [
      ["집에 가기 전에 무엇을 했나요?", ["사진 찍기", "수영하기", "청소만 하기", "잠자기"], 0, "take a picture together — 함께 사진을 찍었어요."],
    ],
  },
  "daily-19-the-soccer-game": {
    pages: [
      ["After the game, our coach says teamwork made the goal possible.", "경기 뒤에 코치님은 팀워크가 골을 가능하게 했다고 말해요."],
    ],
    quiz: [
      ["코치님은 무엇이 골을 가능하게 했다고 했나요?", ["팀워크", "운", "비", "혼자 뛰기"], 0, "teamwork made the goal possible."],
    ],
  },
  "daily-20-grandmas-house": {
    pages: [
      ["In the car, I tell Mom my favorite part was Grandma's old story.", "차 안에서 나는 가장 좋았던 부분이 할머니의 옛날이야기였다고 엄마에게 말해요."],
    ],
    quiz: [
      ["가장 좋았던 부분은 무엇이었나요?", ["할머니의 옛날이야기", "차 문", "신발", "비"], 0, "Grandma's old story가 가장 좋았어요."],
    ],
  },
  "daily-5-at-the-market": {
    pages: [
      ["Mom compares two prices before she buys apples. I learn that some fruit costs more when it is fresh.", "엄마는 사과를 사기 전에 두 가격을 비교해요. 나는 어떤 과일은 신선할 때 더 비싸다는 걸 배워요."],
      ["We carry the bags home and count our change. Shopping carefully helps our family save money.", "우리는 봉투를 집으로 들고 가며 거스름돈을 세요. 신중하게 장을 보면 가족이 돈을 아낄 수 있어요."],
    ],
    quiz: [
      ["엄마는 사과를 사기 전에 무엇을 비교했나요?", ["두 가격", "신발", "날씨", "책"], 0, "compares two prices — 두 가격을 비교했어요."],
    ],
  },
  "daily-11-at-the-restaurant": {
    pages: [
      ["When the soup is too hot, I wait and blow gently. Good manners help everyone enjoy dinner.", "수프가 너무 뜨거울 때 나는 기다리며 살짝 불어요. 좋은 예절은 모두가 저녁을 즐기는 데 도움이 돼요."],
      ["Before we leave, I say thank you to the server. I feel proud because I ordered politely.", "떠나기 전에 나는 직원에게 감사 인사를 해요. 예의 바르게 주문해서 자랑스러워요."],
    ],
    quiz: [
      ["수프가 너무 뜨거울 때 어떻게 했나요?", ["기다리고 살짝 불었어요", "바로 마셨어요", "버렸어요", "울었어요"], 0, "wait and blow gently — 기다리고 살짝 불었어요."],
    ],
  },
  "daily-21-a-trip-to-the-zoo": {
    pages: [
      ["Before leaving, our guide reminds us not to feed the animals. Respecting their homes keeps them healthy and safe.", "떠나기 전에 안내 선생님은 동물에게 먹이를 주지 말라고 알려주세요. 동물의 집을 존중하면 동물들이 건강하고 안전해요."],
    ],
    quiz: [
      ["안내 선생님은 동물에게 무엇을 하지 말라고 했나요?", ["먹이 주기", "보기", "그리기", "조용히 걷기"], 0, "not to feed the animals — 먹이를 주지 말라는 뜻이에요."],
    ],
  },
  "daily-22-show-and-tell": {
    pages: [
      ["At the end, our teacher says good speakers also make good listeners. I understand that sharing goes both ways.", "마지막에 선생님은 말을 잘하는 사람은 잘 듣기도 한다고 말해요. 나는 나눔이 서로 오가는 것임을 이해해요."],
    ],
    quiz: [
      ["선생님은 좋은 발표자가 무엇도 잘한다고 했나요?", ["잘 듣기", "빨리 달리기", "그림만 보기", "숨기기"], 0, "good listeners — 잘 듣는 사람이기도 해요."],
    ],
  },
  "daily-6-a-weekend-trip": {
    pages: [
      ["After lunch, we follow a forest path behind the cabin. The signs are easy to miss, so we read them carefully together.", "점심 뒤에 우리는 오두막 뒤 숲길을 따라가요. 표지판을 놓치기 쉬워서 함께 조심히 읽어요."],
      ["When we reach the lookout, the whole valley opens below us. I notice how small the roads look from above.", "전망대에 도착하자 계곡 전체가 우리 아래로 펼쳐져요. 위에서 보면 길들이 얼마나 작아 보이는지 알아차려요."],
      ["On the way home, I write the best moment in my travel notebook. Remembering details helps the trip stay alive in my mind.", "집으로 가는 길에 나는 여행 공책에 최고의 순간을 써요. 세부 사항을 기억하면 여행이 마음속에 살아 있게 돼요."],
    ],
    quiz: [
      ["전망대에서는 무엇이 아래로 펼쳐졌나요?", ["계곡", "교실", "시장", "바다만"], 0, "the whole valley opens below us."],
    ],
  },
  "daily-12-the-lost-puppy": {
    pages: [
      ["We decide to make a simple plan instead of running in different directions. Dad checks the park gate while I ask the shop owner.", "우리는 여기저기 뛰어다니는 대신 간단한 계획을 세우기로 해요. 아빠는 공원 문을 확인하고 나는 가게 주인에게 물어요."],
      ["The shop owner remembers seeing a small puppy near the bakery. That clue helps us choose the next street to search.", "가게 주인은 빵집 근처에서 작은 강아지를 본 것을 기억해요. 그 단서 덕분에 다음으로 찾을 거리를 고를 수 있어요."],
      ["When Coco finally hears his name, he runs toward us with muddy paws. I learn that calm thinking can solve scary problems.", "코코가 마침내 자기 이름을 듣자 진흙 묻은 발로 우리에게 달려와요. 나는 차분한 생각이 무서운 문제도 해결할 수 있음을 배워요."],
    ],
    quiz: [
      ["가게 주인은 강아지를 어디 근처에서 봤다고 했나요?", ["빵집", "병원", "학교", "강"], 0, "near the bakery — 빵집 근처예요."],
    ],
  },
  "daily-23-camping-by-the-lake": {
    pages: [
      ["Before hiking, Dad teaches us to pack only what we need. A lighter bag makes the long trail easier and safer.", "하이킹 전에 아빠는 필요한 것만 챙기는 법을 가르쳐줘요. 가벼운 가방은 긴 길을 더 쉽고 안전하게 해요."],
      ["Clouds gather in the afternoon, so we return to the tent early. Planning ahead keeps the trip comfortable.", "오후에 구름이 모여서 우리는 일찍 텐트로 돌아와요. 미리 계획하면 여행이 편안해져요."],
      ["Back home, I draw a map of the campsite and label the lake, trees, and trail. The map helps me retell the adventure.", "집에 돌아와 나는 캠핑장 지도를 그리고 호수, 나무, 길에 이름을 붙여요. 그 지도는 모험을 다시 말하는 데 도움이 돼요."],
    ],
    quiz: [
      ["가벼운 가방은 긴 길을 어떻게 만들어 주나요?", ["쉽고 안전하게", "더 위험하게", "더 어둡게", "더 시끄럽게"], 0, "easier and safer — 더 쉽고 안전하게요."],
    ],
  },
  "daily-24-the-talent-show": {
    pages: [
      ["After the show, a younger student asks how I stayed brave on stage. I tell her that practice made the room feel less strange.", "공연 뒤에 어린 학생이 무대에서 어떻게 용감했는지 물어요. 나는 연습 덕분에 공연장이 덜 낯설게 느껴졌다고 말해요."],
      ["I also tell her that mistakes can happen, even after many rehearsals. The important thing is to keep playing and breathe.", "나는 연습을 많이 해도 실수는 생길 수 있다고 말해요. 중요한 것은 계속 연주하고 숨 쉬는 거예요."],
      ["That night, I place the program beside my music book. It reminds me that courage grows little by little.", "그날 밤 나는 프로그램을 음악책 옆에 놓아요. 그것은 용기가 조금씩 자란다는 걸 떠올리게 해요."],
    ],
    quiz: [
      ["어린 학생에게 용감함의 이유로 무엇을 말했나요?", ["연습", "운", "큰 소리", "새 신발"], 0, "practice made the room feel less strange."],
    ],
  },
};

function pageText(page) {
  return page.sentences?.map((s) => s.text).join(" ") ?? "";
}

let touched = 0;
for (const [slug, patch] of Object.entries(APPENDS)) {
  const file = join(SEED, `${slug}.json`);
  if (!existsSync(file)) throw new Error(`Missing ${file}`);
  const book = JSON.parse(readFileSync(file, "utf8"));
  const wantedLevel = LEVEL_BY_STAGE[book.stage];
  let changed = false;
  if (wantedLevel && book.level !== wantedLevel) {
    book.level = wantedLevel;
    changed = true;
  }

  const existingTexts = new Set(book.pages.map(pageText));
  for (const [text, translation_ko] of patch.pages) {
    if (!existingTexts.has(text)) {
      book.pages.push({ sentences: [{ text, translation_ko }] });
      existingTexts.add(text);
      changed = true;
    }
  }

  const existingQuestions = new Set(book.quiz.map((q) => q.question_ko));
  for (const [question_ko, options, answerIndex, explain_ko] of patch.quiz) {
    if (!existingQuestions.has(question_ko)) {
      book.quiz.push({
        question_ko,
        type: "mc",
        options,
        answerIndex,
        explain_ko,
      });
      changed = true;
    }
  }

  if (changed) {
    writeFileSync(file, `${JSON.stringify(book, null, 2)}\n`);
    touched++;
    console.log(`✅ 보강 ${slug} -> ${book.pages.length}p, level ${book.level}`);
  } else {
    console.log(`↩︎ 이미 보강됨 ${slug}`);
  }
}

// stage별 CEFR 표기는 daily 전체에 일괄 적용한다.
for (const name of readdirSync(SEED)) {
  if (!/^daily-\d+-.+\.json$/.test(name)) continue;
  const file = join(SEED, name);
  const book = JSON.parse(readFileSync(file, "utf8"));
  const wantedLevel = LEVEL_BY_STAGE[book.stage];
  if (wantedLevel && book.level !== wantedLevel) {
    book.level = wantedLevel;
    writeFileSync(file, `${JSON.stringify(book, null, 2)}\n`);
    touched++;
    console.log(`✅ 레벨 보정 ${book.slug} -> ${wantedLevel}`);
  }
}

console.log(`\n보정 파일 ${touched}개`);
