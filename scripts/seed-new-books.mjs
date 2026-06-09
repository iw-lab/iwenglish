/**
 * 생활영어 확장 2차: daily-13 ~ daily-24 (stage 1~6, 단계당 2권) JSON 생성.
 * 소스엔 text + translation_ko 만. 음성/wordTimings 는 seed:audio 가 채움.
 *   node scripts/seed-new-books.mjs
 */
import { writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const SEED = join(process.cwd(), "data", "seed");

// [en, ko]
const B = [
  {
    slug: "daily-13-brush-brush", title: "Brush, Brush!", title_ko: "치카치카!",
    level: "preA1", stage: 1,
    summary_ko: "아침에 일어나 스스로 이를 닦는 과정을 가장 쉬운 단어로 익혀요. 양치 습관과 기본 동사를 배워요.",
    P: [
      ["It is time to brush my teeth.", "이를 닦을 시간이에요."],
      ["I get my toothbrush.", "나는 칫솔을 가져와요."],
      ["I put on some toothpaste.", "치약을 조금 짜요."],
      ["I brush up and down.", "위아래로 닦아요."],
      ["I rinse with water.", "물로 헹궈요."],
      ["Now my teeth are clean!", "이제 이가 깨끗해요!"],
    ],
    Q: [
      ["무엇을 닦았나요?", ["손", "이", "발", "얼굴"], 1, "brush my teeth — 이를 닦았어요."],
      ["이를 닦을 때 무엇을 짰나요?", ["물", "비누", "치약", "주스"], 2, "toothpaste는 치약이에요."],
      ["어느 방향으로 닦았나요?", ["위아래로", "옆으로만", "안 닦음", "빙글빙글"], 0, "up and down — 위아래로 닦았어요."],
      ["입을 무엇으로 헹궜나요?", ["우유", "물", "주스", "차"], 1, "rinse with water — 물로 헹궜어요."],
      ["다 닦고 나니 이가 어땠나요?", ["더러워요", "깨끗해요", "아파요", "노래요"], 1, "clean은 깨끗하다는 뜻이에요."],
    ],
  },
  {
    slug: "daily-14-my-cat-nabi", title: "My Cat Nabi", title_ko: "우리 고양이 나비",
    level: "preA1", stage: 1,
    summary_ko: "내가 키우는 작은 고양이 나비를 소개해요. 반려동물과 기본 형용사를 쉬운 문장으로 만나요.",
    P: [
      ["I have a little cat.", "나는 작은 고양이가 있어요."],
      ["Her name is Nabi.", "이름은 나비예요."],
      ["Nabi is soft and white.", "나비는 보드랍고 하얘요."],
      ["She likes to play with a ball.", "나비는 공을 가지고 노는 걸 좋아해요."],
      ["She sleeps on my bed.", "나비는 내 침대에서 자요."],
      ["I love my cat Nabi.", "나는 우리 나비를 사랑해요."],
    ],
    Q: [
      ["나는 어떤 동물을 키우나요?", ["강아지", "고양이", "토끼", "새"], 1, "cat은 고양이예요."],
      ["고양이의 이름은 무엇인가요?", ["나비", "코코", "보리", "초코"], 0, "Her name is Nabi."],
      ["나비는 무슨 색인가요?", ["검정", "노랑", "하양", "갈색"], 2, "white는 하얀색이에요."],
      ["나비는 무엇을 가지고 노나요?", ["공", "인형", "끈", "상자"], 0, "play with a ball — 공을 가지고 놀아요."],
      ["나비는 어디서 자나요?", ["바닥", "소파", "내 침대", "상자"], 2, "sleeps on my bed — 내 침대에서 자요."],
    ],
  },
  {
    slug: "daily-15-at-the-playground", title: "At the Playground", title_ko: "놀이터에서",
    level: "A1", stage: 2,
    summary_ko: "학교가 끝나고 친구들과 놀이터에서 노는 즐거운 오후. 놀이 기구 이름과 함께하는 표현을 배워요.",
    P: [
      ["After school, I go to the playground.", "학교가 끝나고 놀이터에 가요."],
      ["My friends are there too.", "친구들도 거기 있어요."],
      ["I climb up and slide down.", "나는 올라가서 미끄럼을 타요."],
      ["We play on the swings together.", "우리는 함께 그네를 타요."],
      ["\"Push me higher!\" I say.", "\"더 높이 밀어줘!\" 내가 말해요."],
      ["We run and laugh for a long time.", "우리는 오랫동안 뛰고 웃어요."],
      ["Playing with friends is so much fun.", "친구들과 노는 건 정말 재미있어요."],
    ],
    Q: [
      ["언제 놀이터에 갔나요?", ["학교 전에", "학교가 끝나고", "밤에", "주말 아침"], 1, "After school — 학교가 끝나고요."],
      ["놀이터에 누가 함께 있었나요?", ["선생님", "친구들", "가족", "아무도 없음"], 1, "My friends are there too."],
      ["미끄럼틀에서 무엇을 했나요?", ["올라가서 미끄럼 탐", "그냥 봄", "앉아 있음", "밀어줌"], 0, "climb up and slide down."],
      ["함께 무엇을 탔나요?", ["시소", "그네", "자전거", "버스"], 1, "swings는 그네예요."],
      ["\"더 높이 밀어줘\"는 무엇을 탈 때 한 말일까요?", ["미끄럼틀", "그네", "철봉", "모래놀이"], 1, "그네를 밀어달라는 말이에요."],
    ],
  },
  {
    slug: "daily-16-a-rainy-day", title: "A Rainy Day", title_ko: "비 오는 날",
    level: "A1", stage: 2,
    summary_ko: "비 오는 날 비옷과 장화를 챙겨 밖으로 나가요. 날씨 표현과 비 오는 날의 즐거움을 배워요.",
    P: [
      ["I look out the window.", "나는 창밖을 봐요."],
      ["It is raining today.", "오늘은 비가 와요."],
      ["I put on my yellow raincoat.", "나는 노란 비옷을 입어요."],
      ["I take my umbrella and boots.", "우산과 장화를 챙겨요."],
      ["I jump in the puddles. Splash!", "물웅덩이에서 첨벙 뛰어요!"],
      ["The rain feels cool on my hands.", "비가 손에 시원하게 느껴져요."],
      ["Rainy days can be fun too.", "비 오는 날도 재미있어요."],
    ],
    Q: [
      ["오늘 날씨는 어떤가요?", ["맑음", "비", "눈", "바람"], 1, "It is raining — 비가 와요."],
      ["무슨 색 비옷을 입었나요?", ["빨강", "파랑", "노랑", "초록"], 2, "yellow raincoat — 노란 비옷이에요."],
      ["무엇을 챙겼나요?", ["우산과 장화", "모자와 장갑", "가방과 책", "공과 글러브"], 0, "umbrella and boots."],
      ["물웅덩이에서 무엇을 했나요?", ["걸었어요", "첨벙 뛰었어요", "앉았어요", "피했어요"], 1, "jump in the puddles — 첨벙 뛰었어요."],
      ["비는 손에 어떻게 느껴졌나요?", ["뜨겁게", "시원하게", "아프게", "간지럽게"], 1, "cool은 시원하다는 뜻이에요."],
    ],
  },
  {
    slug: "daily-17-at-the-library", title: "At the Library", title_ko: "도서관에서",
    level: "A2", stage: 3,
    summary_ko: "토요일에 도서관에 가서 좋아하는 책을 찾아 빌려요. 도서관 규칙과 읽기에 관한 표현을 배워요.",
    P: [
      ["On Saturday, we go to the library.", "토요일에 우리는 도서관에 가요."],
      ["There are so many books here.", "여기엔 책이 정말 많아요."],
      ["We must be quiet inside.", "안에서는 조용히 해야 해요."],
      ["I look for a book about animals.", "나는 동물에 관한 책을 찾아요."],
      ["I find a big book about tigers.", "호랑이에 관한 큰 책을 찾았어요."],
      ["I sit down and read quietly.", "나는 앉아서 조용히 읽어요."],
      ["I borrow two books to take home.", "집에 가져갈 책 두 권을 빌려요."],
      ["I can't wait to read them all.", "얼른 다 읽고 싶어요."],
    ],
    Q: [
      ["언제 도서관에 갔나요?", ["월요일", "토요일", "금요일", "수요일"], 1, "On Saturday — 토요일이에요."],
      ["도서관 안에서는 어떻게 해야 하나요?", ["뛰어요", "노래해요", "조용히 해요", "크게 말해요"], 2, "must be quiet — 조용히 해야 해요."],
      ["어떤 책을 찾았나요?", ["우주", "동물", "요리", "역사"], 1, "a book about animals."],
      ["큰 책은 무엇에 관한 것이었나요?", ["사자", "호랑이", "코끼리", "곰"], 1, "a big book about tigers."],
      ["책을 몇 권 빌렸나요?", ["한 권", "두 권", "세 권", "다섯 권"], 1, "borrow two books — 두 권이에요."],
    ],
  },
  {
    slug: "daily-18-helping-at-home", title: "I Help at Home", title_ko: "집안일을 도와요",
    level: "A2", stage: 3,
    summary_ko: "가족을 위해 여러 집안일을 스스로 돕는 하루. 집안일 동사와 돕는 마음에 관한 표현을 배워요.",
    P: [
      ["Today I want to help my family.", "오늘 나는 가족을 돕고 싶어요."],
      ["I make my bed in the morning.", "아침에 이불을 정리해요."],
      ["I help Mom set the table.", "엄마가 상 차리는 걸 도와요."],
      ["After dinner, I wash the dishes.", "저녁을 먹고 설거지를 해요."],
      ["I water the plants by the window.", "창가의 화분에 물을 줘요."],
      ["I put my toys back in the box.", "장난감을 상자에 다시 넣어요."],
      ["\"Thank you for helping,\" says Mom.", "\"도와줘서 고마워.\" 엄마가 말해요."],
      ["Helping my family makes me happy.", "가족을 도우니 기뻐요."],
    ],
    Q: [
      ["오늘 무엇을 하고 싶었나요?", ["놀기", "가족 돕기", "자기", "사기"], 1, "help my family — 가족을 돕고 싶었어요."],
      ["아침에 무엇을 정리했나요?", ["책상", "이불", "신발", "가방"], 1, "make my bed — 이불을 정리해요."],
      ["저녁을 먹고 무엇을 했나요?", ["설거지", "빨래", "청소기", "요리"], 0, "wash the dishes — 설거지를 했어요."],
      ["창가의 무엇에 물을 줬나요?", ["화분", "강아지", "잔디", "꽃밭"], 0, "water the plants — 화분에 물을 줬어요."],
      ["가족을 도우니 기분이 어땠나요?", ["슬퍼요", "기뻐요", "피곤해요", "화나요"], 1, "makes me happy — 기뻐요."],
    ],
  },
  {
    slug: "daily-19-the-soccer-game", title: "The Soccer Game", title_ko: "축구 경기",
    level: "A2", stage: 4,
    summary_ko: "팀과 함께 큰 축구 경기에 나가 골을 넣고 승리하는 이야기. 운동 표현과 협동, 자신감을 배워요.",
    P: [
      ["Today is our big soccer game.", "오늘은 우리의 큰 축구 경기예요."],
      ["I wear my team's blue shirt.", "나는 우리 팀의 파란 셔츠를 입어요."],
      ["The other team is very fast.", "상대 팀은 아주 빨라요."],
      ["I run after the ball as fast as I can.", "나는 공을 따라 힘껏 달려요."],
      ["My friend passes the ball to me.", "친구가 나에게 공을 건네줘요."],
      ["I kick the ball into the goal!", "나는 공을 골대 안으로 차 넣어요!"],
      ["Everyone cheers and claps for me.", "모두가 나를 향해 환호하고 박수쳐요."],
      ["We win the game and feel proud.", "우리는 경기를 이기고 자랑스러워요."],
    ],
    Q: [
      ["오늘은 무슨 경기였나요?", ["야구", "축구", "농구", "달리기"], 1, "soccer game — 축구 경기예요."],
      ["우리 팀 셔츠는 무슨 색인가요?", ["빨강", "파랑", "노랑", "초록"], 1, "blue shirt — 파란 셔츠예요."],
      ["누가 나에게 공을 건네줬나요?", ["선생님", "친구", "상대 선수", "감독"], 1, "My friend passes the ball."],
      ["나는 공을 어디에 넣었나요?", ["밖으로", "골대 안", "친구에게", "벤치로"], 1, "into the goal — 골대 안으로요."],
      ["경기 결과는 어땠나요?", ["졌어요", "비겼어요", "이겼어요", "취소됐어요"], 2, "We win the game — 이겼어요."],
    ],
  },
  {
    slug: "daily-20-grandmas-house", title: "Grandma's House", title_ko: "할머니 댁",
    level: "A2", stage: 4,
    summary_ko: "일요일에 할머니 댁을 찾아가 함께 요리하고 이야기를 나누는 따뜻한 하루. 가족과 정겨운 표현을 배워요.",
    P: [
      ["On Sunday, we visit Grandma's house.", "일요일에 우리는 할머니 댁에 가요."],
      ["Grandma gives me a warm hug.", "할머니가 따뜻하게 안아주세요."],
      ["Her house smells like fresh bread.", "할머니 집에서는 갓 구운 빵 냄새가 나요."],
      ["We cook lunch together in the kitchen.", "우리는 부엌에서 함께 점심을 만들어요."],
      ["Grandma tells me a story from long ago.", "할머니가 옛날이야기를 들려주세요."],
      ["We sit in the garden and drink tea.", "우리는 정원에 앉아 차를 마셔요."],
      ["It is time to go home now.", "이제 집에 갈 시간이에요."],
      ["I hope we come back again soon.", "곧 다시 오면 좋겠어요."],
    ],
    Q: [
      ["언제 할머니 댁에 갔나요?", ["토요일", "일요일", "월요일", "금요일"], 1, "On Sunday — 일요일이에요."],
      ["할머니가 무엇을 해주셨나요?", ["선물", "따뜻한 포옹", "용돈", "노래"], 1, "a warm hug — 따뜻한 포옹이에요."],
      ["할머니 집에서 무슨 냄새가 났나요?", ["꽃", "갓 구운 빵", "커피", "비누"], 1, "smells like fresh bread."],
      ["부엌에서 함께 무엇을 했나요?", ["청소", "점심 만들기", "설거지", "공부"], 1, "cook lunch together."],
      ["정원에서 무엇을 마셨나요?", ["주스", "물", "차", "우유"], 2, "drink tea — 차를 마셨어요."],
    ],
  },
  {
    slug: "daily-21-a-trip-to-the-zoo", title: "A Trip to the Zoo", title_ko: "동물원 나들이",
    level: "B1", stage: 5,
    summary_ko: "반 친구들과 함께 동물원으로 현장학습을 떠나 여러 동물을 만나는 하루. 동물 이름과 묘사 표현을 풍부하게 배워요.",
    P: [
      ["Our class is going to the zoo today.", "오늘 우리 반은 동물원에 가요."],
      ["I am so excited I can hardly wait.", "너무 신나서 기다리기 힘들어요."],
      ["First, we see the tall giraffes.", "먼저 우리는 키 큰 기린들을 봐요."],
      ["They eat leaves from the high trees.", "기린들은 높은 나무의 잎을 먹어요."],
      ["The monkeys jump and play together.", "원숭이들은 함께 뛰고 놀아요."],
      ["I watch the lions sleep in the sun.", "나는 사자들이 햇볕 아래 자는 걸 봐요."],
      ["We eat our lunch near the pond.", "우리는 연못 근처에서 점심을 먹어요."],
      ["I draw a picture of my favorite animal.", "나는 가장 좋아하는 동물을 그려요."],
      ["What a wonderful day at the zoo!", "동물원에서 정말 멋진 하루였어요!"],
    ],
    Q: [
      ["누구와 함께 동물원에 갔나요?", ["가족", "우리 반", "친구 한 명", "혼자"], 1, "Our class — 우리 반과 함께요."],
      ["가장 먼저 본 동물은?", ["사자", "기린", "원숭이", "코끼리"], 1, "First, we see the tall giraffes."],
      ["기린은 무엇을 먹나요?", ["고기", "높은 나무의 잎", "물고기", "풀뿌리"], 1, "eat leaves from the high trees."],
      ["사자들은 무엇을 하고 있었나요?", ["뛰어놀아요", "햇볕 아래 자요", "헤엄쳐요", "울어요"], 1, "the lions sleep in the sun."],
      ["점심은 어디서 먹었나요?", ["버스 안", "연못 근처", "사자 우리 앞", "정문"], 1, "near the pond — 연못 근처에서요."],
    ],
  },
  {
    slug: "daily-22-show-and-tell", title: "Show and Tell", title_ko: "발표 시간",
    level: "B1", stage: 5,
    summary_ko: "학교 발표 시간에 좋아하는 장난감 로봇을 친구들에게 소개해요. 긴장을 이기고 발표하는 용기를 배워요.",
    P: [
      ["Today is show and tell at school.", "오늘은 학교에서 발표하는 날이에요."],
      ["Each of us brings something special.", "우리는 각자 특별한 걸 가져와요."],
      ["I bring my favorite toy robot.", "나는 가장 좋아하는 장난감 로봇을 가져와요."],
      ["At first, I feel a little nervous.", "처음에는 조금 긴장돼요."],
      ["I stand in front of the class.", "나는 반 앞에 서요."],
      ["This robot was a gift from my dad.", "이 로봇은 아빠가 준 선물이에요."],
      ["My friends ask me many questions.", "친구들이 나에게 여러 질문을 해요."],
      ["I answer them with a big smile.", "나는 활짝 웃으며 대답해요."],
      ["Sharing my robot was really fun.", "내 로봇을 보여주는 건 정말 즐거웠어요."],
    ],
    Q: [
      ["오늘은 무슨 날인가요?", ["소풍", "발표하는 날", "운동회", "시험"], 1, "show and tell — 발표하는 날이에요."],
      ["나는 무엇을 가져왔나요?", ["책", "장난감 로봇", "그림", "공"], 1, "my favorite toy robot."],
      ["처음에 기분이 어땠나요?", ["신나요", "조금 긴장돼요", "졸려요", "화나요"], 1, "a little nervous — 조금 긴장됐어요."],
      ["로봇은 누가 준 선물인가요?", ["엄마", "아빠", "할머니", "친구"], 1, "a gift from my dad."],
      ["친구들에게 어떻게 대답했나요?", ["울면서", "활짝 웃으며", "화내며", "작게"], 1, "with a big smile — 활짝 웃으며요."],
    ],
  },
  {
    slug: "daily-23-camping-by-the-lake", title: "Camping by the Lake", title_ko: "호숫가 캠핑",
    level: "B1", stage: 6,
    summary_ko: "가족과 호숫가로 캠핑을 떠나 텐트를 치고 별을 보며 보내는 특별한 주말. 자연과 캠핑 표현을 풍부하게 배워요.",
    P: [
      ["This weekend, my family goes camping by the lake.", "이번 주말에 우리 가족은 호숫가로 캠핑을 가요."],
      ["We put up our tent under the tall trees.", "우리는 큰 나무 아래에 텐트를 쳐요."],
      ["Dad teaches me how to start a small fire.", "아빠가 작은 불 피우는 법을 가르쳐줘요."],
      ["We cook dinner and eat under the sky.", "우리는 저녁을 만들어 하늘 아래에서 먹어요."],
      ["When night comes, the stars shine brightly.", "밤이 되면 별들이 밝게 빛나요."],
      ["We hear the sound of frogs near the water.", "물가에서 개구리 소리가 들려요."],
      ["In the morning, the air feels cool and fresh.", "아침에는 공기가 시원하고 상쾌해요."],
      ["We swim in the clear lake water.", "우리는 맑은 호수에서 헤엄쳐요."],
      ["I will always remember this special trip.", "나는 이 특별한 여행을 늘 기억할 거예요."],
    ],
    Q: [
      ["가족과 어디로 캠핑을 갔나요?", ["바닷가", "호숫가", "산꼭대기", "공원"], 1, "camping by the lake — 호숫가예요."],
      ["텐트를 어디에 쳤나요?", ["바위 위", "큰 나무 아래", "물 안", "주차장"], 1, "under the tall trees."],
      ["아빠가 무엇을 가르쳐줬나요?", ["헤엄치기", "불 피우는 법", "낚시", "요리"], 1, "how to start a small fire."],
      ["밤에 무엇이 밝게 빛났나요?", ["달", "별", "등불", "도시"], 1, "the stars shine brightly — 별이에요."],
      ["물가에서 무슨 소리가 들렸나요?", ["새", "개구리", "바람", "물고기"], 1, "the sound of frogs — 개구리 소리예요."],
    ],
  },
  {
    slug: "daily-24-the-talent-show", title: "The Talent Show", title_ko: "장기자랑",
    level: "B1", stage: 6,
    summary_ko: "학교 장기자랑에서 피아노 연주를 준비하고 무대에 오르는 이야기. 연습과 용기, 성취감을 풍부한 표현으로 배워요.",
    P: [
      ["Our school is having a talent show.", "우리 학교에서 장기자랑이 열려요."],
      ["I decide to play a song on the piano.", "나는 피아노로 노래를 연주하기로 해요."],
      ["Every day after school, I practice hard.", "매일 학교가 끝나고 열심히 연습해요."],
      ["On the day of the show, my heart beats fast.", "공연 날, 내 심장이 빠르게 뛰어요."],
      ["The lights are bright and the hall is full.", "조명은 밝고 강당은 가득 찼어요."],
      ["I take a deep breath and begin to play.", "나는 깊게 숨을 쉬고 연주를 시작해요."],
      ["My fingers move softly across the keys.", "내 손가락이 건반 위를 부드럽게 움직여요."],
      ["When I finish, everyone claps loudly.", "내가 끝내자 모두가 크게 박수쳐요."],
      ["I feel proud that I did my best.", "최선을 다해서 자랑스러워요."],
    ],
    Q: [
      ["학교에서 무엇이 열렸나요?", ["운동회", "장기자랑", "소풍", "시험"], 1, "a talent show — 장기자랑이에요."],
      ["나는 무엇으로 연주하기로 했나요?", ["기타", "피아노", "바이올린", "북"], 1, "play a song on the piano."],
      ["언제 연습했나요?", ["아침마다", "매일 학교가 끝나고", "주말에만", "안 했어요"], 1, "Every day after school, I practice hard."],
      ["공연 날 마음이 어땠나요?", ["심장이 빠르게 뛰어요", "졸려요", "화나요", "심심해요"], 0, "my heart beats fast — 긴장됐어요."],
      ["연주를 마치자 사람들이 무엇을 했나요?", ["나갔어요", "크게 박수쳤어요", "조용했어요", "노래했어요"], 1, "everyone claps loudly."],
    ],
  },
];

let made = 0;
for (const b of B) {
  const file = join(SEED, `${b.slug}.json`);
  if (existsSync(file)) { console.log(`↩︎ 이미 있음 ${b.slug}`); continue; }
  const obj = {
    slug: b.slug,
    title: b.title,
    title_ko: b.title_ko,
    level: b.level,
    ageBand: "8-10",
    stage: b.stage,
    collection: "daily",
    summary_ko: b.summary_ko,
    pages: b.P.map(([text, translation_ko]) => ({
      sentences: [{ text, translation_ko }],
    })),
    words: {},
    quiz: b.Q.map(([question_ko, options, answerIndex, explain_ko]) => ({
      question_ko, type: "mc", options, answerIndex, explain_ko,
    })),
  };
  writeFileSync(file, JSON.stringify(obj, null, 2));
  made++;
  console.log(`✅ ${b.slug} (stage${b.stage}, ${b.P.length}문장)`);
}
console.log(`\n생성 ${made}권 / 총 ${B.length}권`);
