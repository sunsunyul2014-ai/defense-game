// algorithms.js - 알고리즘 마스터 챕터 데이터
const ALGO_CHAPTERS = [
  {
    id: 1,
    title: "01장. 알고리즘 기초",
    icon: "🧠",
    sections: [
      {
        id: "01-1",
        title: "01-1 알고리즘이란?",
        icon: "💡",
        concept: `<h3>알고리즘(Algorithm)이란?</h3>
<p>알고리즘이란 <strong>문제를 해결하기 위한 단계적인 절차</strong>입니다. 어떤 입력이 주어졌을 때 원하는 출력을 얻기 위한 명확한 지시들의 집합입니다.</p>
<br>
<h4>좋은 알고리즘의 조건</h4>
<ul>
<li>✅ <strong>입력(Input)</strong> — 0개 이상의 입력</li>
<li>✅ <strong>출력(Output)</strong> — 1개 이상의 출력</li>
<li>✅ <strong>명확성(Definiteness)</strong> — 각 단계가 명확</li>
<li>✅ <strong>유한성(Finiteness)</strong> — 반드시 종료</li>
<li>✅ <strong>효과성(Effectiveness)</strong> — 실제 수행 가능</li>
</ul>
<br>
<h4>순서도(Flowchart) 주요 기호</h4>
<p>⬭ <strong>타원</strong> = 시작/종료 &nbsp;|&nbsp; ▭ <strong>사각형</strong> = 처리 &nbsp;|&nbsp; ◇ <strong>마름모</strong> = 판단(Yes/No) &nbsp;|&nbsp; ▱ <strong>평행사변형</strong> = 입출력</p>`,
        examples: [
          {
            id: "ex-01-1-1",
            title: "세 정수의 최댓값 구하기",
            explanation: "세 개의 숫자 a, b, c 중에서 가장 큰 값을 찾는 알고리즘입니다. 조건문(if)으로 하나씩 비교합니다.",
            code: `a, b, c = 3, 7, 2
maximum = a
if b > maximum:
    maximum = b
if c > maximum:
    maximum = c
print(f"세 수 {a}, {b}, {c} 중 최댓값은 {maximum}입니다.")`,
            expectedOut: "세 수 3, 7, 2 중 최댓값은 7입니다."
          },
          {
            id: "ex-01-1-2",
            title: "조건문과 분기",
            explanation: "조건에 따라 실행 흐름을 다르게 가져가는 것이 분기입니다. if / elif / else로 구현합니다.",
            code: `score = 85
if score >= 90:
    grade = "A"
elif score >= 80:
    grade = "B"
elif score >= 70:
    grade = "C"
elif score >= 60:
    grade = "D"
else:
    grade = "F"
print(f"점수 {score}점 → 학점: {grade}")`,
            expectedOut: "점수 85점 → 학점: B"
          }
        ],
        problems: [
          {
            id: "prob-01-1-1",
            title: "🎯 실습: 두 수 중 최솟값",
            description: "x = 10, y = 3 중 더 작은 값(최솟값)을 출력하세요.",
            hint: "if x < y: 로 비교해보세요!",
            expectedOut: "3",
            starterCode: `x = 10
y = 3
# 여기에 두 수 중 최솟값을 찾아 출력하는 코드를 작성하세요.
`
          },
          {
            id: "prob-01-1-2",
            title: "🎯 실습: 양수/음수/0 판별",
            description: "n = -5 를 조건문으로 양수, 음수, 0 중 어떤 것인지 출력하세요.",
            hint: "if / elif / else 3단계로 분기하세요.",
            expectedOut: "음수",
            starterCode: `n = -5
# 여기에 if / elif / else 를 사용하여 양수, 0, 음수를 판별하는 코드를 작성하세요.
`
          }
        ]
      },
      {
        id: "01-2",
        title: "01-2 반복하는 알고리즘",
        icon: "🔁",
        concept: `<h3>반복(Iteration) 알고리즘</h3>
<p>같은 작업을 여러 번 반복해야 할 때 <strong>반복문(loop)</strong>을 사용합니다.</p>
<br>
<h4>while 반복문</h4>
<p>조건이 <strong>참(True)</strong>인 동안 계속 반복합니다.</p>
<pre style="background:rgba(0,0,0,0.3);padding:10px;border-radius:8px;color:#a7f3d0;font-size:13px;">while 조건식:
    반복할 코드
    (조건 변경 코드 필수!)</pre>
<br>
<h4>for 반복문</h4>
<p>주어진 범위의 각 항목에 대해 반복합니다.</p>
<pre style="background:rgba(0,0,0,0.3);padding:10px;border-radius:8px;color:#a7f3d0;font-size:13px;">for 변수 in range(시작, 끝, 증가):
    반복할 코드</pre>
<br>
<h4>반복 제어</h4>
<p>🔵 <strong>break</strong> — 반복문을 즉시 탈출 &nbsp;|&nbsp; 🟡 <strong>continue</strong> — 현재 반복 건너뛰기</p>`,
        examples: [
          {
            id: "ex-01-2-1",
            title: "1부터 n까지 정수의 합 구하기",
            explanation: "1부터 n까지 더하는 반복 알고리즘입니다. while과 for 두 가지 방식을 비교해보세요.",
            code: `n = 10
total = 0
i = 1
while i <= n:
    total += i
    i += 1
print(f"1부터 {n}까지의 합: {total}")`,
            expectedOut: "1부터 10까지의 합: 55"
          },
          {
            id: "ex-01-2-2",
            title: "반복 과정에서 조건 판단하기",
            explanation: "반복 중에 조건을 넣어 특정 경우만 처리합니다.",
            code: `even_sum = 0
for i in range(1, 11):
    if i % 2 == 0:
        even_sum += i
print(f"짝수 합: {even_sum}")

odds = [i for i in range(1, 11) if i % 2 != 0]
print(f"홀수 목록: {odds}")`,
            expectedOut: "짝수 합: 30\n홀수 목록: [1, 3, 5, 7, 9]"
          },
          {
            id: "ex-01-2-3",
            title: "양수만 처리하기",
            explanation: "주어진 목록에서 양수만 골라내는 패턴입니다.",
            code: `inputs = [3, -1, 7, -5, 0, 4]
positives = []
for val in inputs:
    if val > 0:
        positives.append(val)
print(f"양수 목록: {positives}")
print(f"양수의 합: {sum(positives)}")`,
            expectedOut: "양수 목록: [3, 7, 4]\n양수의 합: 14"
          },
          {
            id: "ex-01-2-4",
            title: "반복문 건너뛰기 (break / continue)",
            explanation: "break로 반복을 탈출하고, continue로 특정 항목을 건너뜁니다.",
            code: `print("=== break 예제 ===")
for i in range(1, 11):
    if i == 5:
        print("5 발견! 중단.")
        break
    print(i, end=" ")
print()

print("=== continue 예제 ===")
for i in range(1, 8):
    if i % 3 == 0:
        continue
    print(i, end=" ")`,
            expectedOut: "=== break 예제 ===\n1 2 3 4 5 발견! 중단.\n\n=== continue 예제 ===\n1 2 4 5 7 "
          },
          {
            id: "ex-01-2-5",
            title: "다중 루프 (이중 for문)",
            explanation: "루프 안에 루프가 있는 이중 반복문입니다. 구구단이 대표적인 예제입니다.",
            code: `for dan in range(3, 5):
    print(f"--- {dan}단 ---")
    for i in range(1, 5):
        print(f"{dan} x {i} = {dan * i}")`,
            expectedOut: "--- 3단 ---\n3 x 1 = 3\n3 x 2 = 6\n3 x 3 = 9\n3 x 4 = 12\n--- 4단 ---\n4 x 1 = 4\n4 x 2 = 8\n4 x 3 = 12\n4 x 4 = 16"
          }
        ],
        problems: [
          {
            id: "prob-01-2-1",
            title: "🎯 실습: 1부터 100까지 홀수의 합",
            description: "1부터 100까지 홀수만 더한 결과를 출력하세요.",
            hint: "i % 2 != 0 조건으로 홀수를 판별하세요.",
            expectedOut: "2500",
            starterCode: `total = 0
# 1부터 100까지 반복하며 홀수의 합을 구하세요.
`
          },
          {
            id: "prob-01-2-2",
            title: "🎯 실습: 직사각형 넓이로 변의 길이 찾기",
            description: "넓이 36인 직사각형에서 a ≤ b이고 a × b = 36인 모든 자연수 쌍을 출력하세요.",
            hint: "a는 1부터 36까지, b = 36 // a, a*b == 36 확인!",
            expectedOut: "1 x 36 = 36\n2 x 18 = 36\n3 x 12 = 36\n4 x 9 = 36\n6 x 6 = 36",
            starterCode: `area = 36
# 두 변의 길이를 곱해 36이 되는 모든 자연수 쌍(a <= b)을 찾아 출력하세요.
`
          },
          {
            id: "prob-01-2-3",
            title: "🎯 실습: 연속하는 정수의 합",
            description: "연속하는 두 정수의 합이 25가 되는 쌍을 출력하세요.",
            hint: "a + (a+1) == 25 조건을 찾아보세요.",
            expectedOut: "12 + 13 = 25",
            starterCode: `# 연속하는 두 정수 a와 a+1의 합이 25가 되는 쌍을 출력하세요.
for a in range(1, 100):
    pass`
          }
        ]
      }
    ]
  },
  {
    id: 2,
    title: '02장. 기본 자료구조와 배열',
    icon: '📊',
    sections: [
      {
        id: '02-1',
        title: '02-1 자료구조와 배열',
        icon: '📚',
        concept: `<h3>자료구조와 배열</h3>
<p>파이썬에서 데이터를 관리하는 가장 기본적인 형태는 <strong>배열(리스트와 튜플)</strong>입니다.</p>
<ul>
  <li><strong>리스트(list):</strong> 변경 가능한(mutable) 자료형. <code>[1, 2, 3]</code></li>
  <li><strong>튜플(tuple):</strong> 변경 불가능한(immutable) 자료형. <code>(1, 2, 3)</code></li>
</ul>
<br>
<h4>인덱스와 슬라이스</h4>
<p>배열의 원소는 <strong>인덱스(Index)</strong>를 통해 접근합니다. 0부터 시작합니다.</p>
<pre style="background:rgba(0,0,0,0.3);padding:10px;border-radius:8px;color:#a7f3d0;font-size:13px;">a = [10, 20, 30, 40]
print(a[0]) # 10
print(a[1:3]) # [20, 30] (슬라이스: 1번부터 3번 전까지)</pre>`,
        examples: [
          {
            id: 'ex-02-1-1',
            title: '리스트와 튜플 알아보기',
            explanation: '리스트는 대괄호 [], 튜플은 소괄호 () 를 사용합니다.',
            code: `lst = [1, 2, 3, 4]
tup = (1, 2, 3, 4)
lst[0] = 100 # 리스트는 변경 가능
print(lst)
# tup[0] = 100 # 튜플은 변경 시도 시 에러 발생!`,
            expectedOut: '[100, 2, 3, 4]'
          },
          {
            id: 'ex-02-1-2',
            title: '슬라이스식으로 원소에 접근하기',
            explanation: '슬라이스는 [시작:끝:스텝] 형태로 원소 일부를 추출합니다.',
            code: `data = [0, 10, 20, 30, 40, 50]
print(data[1:4])
print(data[::-1]) # 역순`,
            expectedOut: '[10, 20, 30]\n[50, 40, 30, 20, 10, 0]'
          }
        ],
        problems: [
          {
            id: 'prob-02-1-1',
            title: '🎯 실습: 리스트 슬라이싱',
            description: '리스트 a = [10, 20, 30, 40, 50] 에서 인덱스 1부터 3까지(20, 30, 40) 추출해 출력하세요.',
            hint: 'a[1:4] 를 사용해보세요.',
            expectedOut: '[20, 30, 40]',
            starterCode: `a = [10, 20, 30, 40, 50]
# 슬라이스를 사용하여 [20, 30, 40]을 출력하세요.
`
          }
        ]
      },
      {
        id: '02-2',
        title: '02-2 배열이란?',
        icon: '🔍',
        concept: `<h3>배열 활용하기</h3>
<p>배열의 원소를 스캔하며 최댓값을 찾거나, 역순으로 정렬하는 등 다양한 처리를 할 수 있습니다.</p>
<ul>
  <li><strong>최댓값 구하기:</strong> 모든 원소를 순회하며 현재 최댓값과 비교합니다.</li>
  <li><strong>역순 정렬:</strong> 리스트 양 끝의 원소를 교환(Swap)하여 뒤집습니다.</li>
</ul>
<br>
<h4>주석과 자료형 힌트(Type Hinting)</h4>
<p>파이썬은 동적 타이핑 언어지만, <code>def max_of(a: list) -> int:</code> 처럼 힌트를 줄 수 있습니다.</p>`,
        examples: [
          {
            id: 'ex-02-2-1',
            title: '배열 원소의 최댓값을 구하는 함수 구현하기',
            explanation: '배열의 원소를 하나씩 확인하며 최댓값을 갱신합니다.',
            code: `def max_of(a):
    maximum = a[0]
    for i in range(1, len(a)):
        if a[i] > maximum:
            maximum = a[i]
    return maximum

print(max_of([3, 1, 9, 2, 5]))`,
            expectedOut: '9'
          },
          {
            id: 'ex-02-2-2',
            title: '배열 원소를 역순으로 정렬하기',
            explanation: '투 포인터(Two Pointer) 방식을 이용해 리스트를 직접 뒤집는 방법입니다.',
            code: `def reverse_array(a):
    n = len(a)
    for i in range(n // 2):
        a[i], a[n - i - 1] = a[n - i - 1], a[i]

x = [1, 2, 3, 4, 5]
reverse_array(x)
print(x)`,
            expectedOut: '[5, 4, 3, 2, 1]'
          },
          {
            id: 'ex-02-2-3',
            title: '기수 변환하기 (10진수 -> n진수)',
            explanation: '정수를 n으로 계속 나누며 나머지를 저장해 n진수로 변환합니다.',
            code: `def card_conv(x, r):
    d = ""
    dchar = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    while x > 0:
        d += dchar[x % r]
        x //= r
    return d[::-1]

print("59를 2진수로:", card_conv(59, 2))
print("59를 16진수로:", card_conv(59, 16))`,
            expectedOut: '59를 2진수로: 111011\n59를 16진수로: 3B'
          }
        ],
        problems: [
          {
            id: 'prob-02-2-1',
            title: '🎯 실습: 배열 최댓값 함수 직접 짜기',
            description: '인자로 받은 리스트의 최솟값을 반환하는 min_of 함수를 작성하고, [7, 2, 5, 1, 9]의 최솟값을 출력하세요.',
            hint: 'maximum 대신 minimum 변수를 만들고 비교 조건을 반대로 하세요.',
            expectedOut: '1',
            starterCode: `def min_of(a):
    # 코드를 작성하세요
    pass

data = [7, 2, 5, 1, 9]
print(min_of(data))`
          }
        ]
      }
    ]
  }
];

// window 객체에 바인딩하여 main.js에서 안전하게 접근하도록 수정
if (typeof window !== 'undefined') {
  window.ALGO_CHAPTERS = ALGO_CHAPTERS;
}
