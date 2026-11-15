const define = (database, items) =>
  items.map((item) => ({
    ...item,
    database,
    id: `practice-${database}-${item.id}`,
  }));

export const practiceProblems = [
  ...define("company", [
    {
      id: "salary",
      title: "월급이 높은 직원 찾기",
      tables: ["EMP"],
      requirements: [
        "월급(SAL)이 5,000,000원 이상인 직원의 이름(ENAME)과 월급을 조회하세요.",
        "월급이 높은 순서로 정렬하세요.",
      ],
      hint: "직원 명부에서 월급 조건을 통과하는 사람을 먼저 골라낸다고 생각해 보세요. 그 결과에서 이름과 월급만 보여주고, 가장 많이 받는 사람이 위에 오도록 순서를 정하면 됩니다.",
      answer:
        "SELECT ENAME, SAL\nFROM dbo.EMP\nWHERE SAL >= 5000000\nORDER BY SAL DESC;",
    },
    {
      id: "department",
      title: "개발 부서 직원 조회",
      tables: ["EMP"],
      requirements: [
        "부서 번호(DEPTNO)가 20인 직원의 이름과 직무(JOB)를 조회하세요.",
        "직원 번호(EMPNO) 순서로 정렬하세요.",
      ],
      hint: "부서 번호는 누구를 고를지 결정하는 기준이고, 직원 번호는 줄을 세우는 기준입니다. 먼저 개발 부서 직원만 고른 뒤 이름과 직무를 보여주는 흐름으로 생각해 보세요. 고르는 기준과 순서 기준을 결과에 모두 표시할 필요는 없습니다.",
      answer:
        "SELECT ENAME, JOB\nFROM dbo.EMP\nWHERE DEPTNO = 20\nORDER BY EMPNO;",
    },
    {
      id: "commission",
      title: "수당이 정해지지 않은 직원",
      tables: ["EMP"],
      requirements: [
        "수당(COMM)이 NULL인 직원의 이름과 월급을 조회하세요.",
        "직원 번호 순서로 정렬하세요.",
      ],
      hint: "수당이 0원인 경우와 아직 수당 값이 없는 경우를 구분해 보세요. 여기서는 값이 비어 있는 직원을 골라야 합니다. 그 사람들의 이름과 월급을 꺼낸 뒤 직원 번호 순서로 배치해 보세요.",
      answer:
        "SELECT ENAME, SAL\nFROM dbo.EMP\nWHERE COMM IS NULL\nORDER BY EMPNO;",
    },
    {
      id: "total-pay",
      title: "월급과 수당을 합한 금액",
      tables: ["EMP"],
      requirements: [
        "모든 직원의 이름과 월급·수당의 합계를 조회하세요.",
        "NULL 수당은 0으로 처리하고 합계 열 이름을 총급여로 지정하세요.",
        "총급여가 높은 순서로 정렬하세요.",
      ],
      hint: "직원 한 명마다 총급여라는 계산 항목을 하나 만든다고 생각해 보세요. 수당이 비어 있으면 먼저 0으로 바꾼 뒤 월급에 더합니다. 이렇게 계산한 금액을 기준으로 큰 금액부터 보여주면 됩니다.",
      answer:
        "SELECT ENAME, SAL + COALESCE(COMM, 0) AS 총급여\nFROM dbo.EMP\nORDER BY 총급여 DESC;",
    },
    {
      id: "department-count",
      title: "부서별 직원 수 세기",
      tables: ["EMP"],
      requirements: [
        "부서 번호별로 직원 수를 집계하세요.",
        "직원 수 열 이름은 직원수로 지정하고, 부서 번호 순서로 정렬하세요.",
      ],
      hint: "직원들을 부서 번호가 같은 사람끼리 작은 묶음으로 나누어 보세요. 각 묶음에 몇 명이 있는지 세면 부서마다 한 줄짜리 결과를 만들 수 있습니다. 마지막에는 부서 번호 순서로 정리하세요.",
      answer:
        "SELECT DEPTNO, COUNT(*) AS 직원수\nFROM dbo.EMP\nGROUP BY DEPTNO\nORDER BY DEPTNO;",
    },
    {
      id: "department-name",
      title: "직원 이름 옆에 부서명 붙이기",
      tables: ["EMP", "DEPT"],
      requirements: [
        "직원 이름(ENAME)과 해당 부서명(DNAME)을 조회하세요.",
        "직원과 부서의 DEPTNO를 연결하고 직원 번호 순서로 정렬하세요.",
      ],
      hint: "직원 명부에는 부서 번호가 있고, 부서 목록에는 그 번호에 해당하는 부서명이 있습니다. 같은 부서 번호를 가진 두 목록의 행을 짝지은 뒤, 직원 이름과 부서명을 함께 꺼내는 흐름으로 생각해 보세요.",
      answer:
        "SELECT e.ENAME, d.DNAME\nFROM dbo.EMP AS e\nJOIN dbo.DEPT AS d ON e.DEPTNO = d.DEPTNO\nORDER BY e.EMPNO;",
    },
    {
      id: "above-average",
      title: "평균 월급보다 많이 받는 직원",
      tables: ["EMP"],
      requirements: [
        "전체 직원의 평균 월급보다 월급이 높은 직원의 이름과 월급을 조회하세요.",
        "월급이 높은 순서로 정렬하세요.",
      ],
      hint: "먼저 전체 직원의 월급으로 비교 기준이 될 평균값 하나를 구한다고 생각해 보세요. 그다음 각 직원의 월급을 그 기준값과 비교해 높은 사람만 남기고, 월급이 높은 순서로 정리하면 됩니다.",
      answer:
        "SELECT ENAME, SAL\nFROM dbo.EMP\nWHERE SAL > (SELECT AVG(SAL) FROM dbo.EMP)\nORDER BY SAL DESC;",
    },
    {
      id: "empty-department",
      title: "아직 직원이 없는 부서",
      tables: ["DEPT", "EMP"],
      requirements: [
        "직원이 한 명도 배치되지 않은 부서의 번호와 부서명을 조회하세요.",
        "부서 번호 순서로 정렬하세요.",
      ],
      hint: "모든 부서가 들어 있는 부서 목록에서 출발해 보세요. 부서를 하나씩 보면서 같은 부서 번호를 가진 직원이 있는지 확인하고, 한 명도 찾을 수 없는 부서만 결과에 남기는 방식으로 생각하면 됩니다.",
      answer:
        "SELECT d.DEPTNO, d.DNAME\nFROM dbo.DEPT AS d\nWHERE NOT EXISTS (\n  SELECT 1 FROM dbo.EMP AS e WHERE e.DEPTNO = d.DEPTNO\n)\nORDER BY d.DEPTNO;",
    },
  ]),
  ...define("store", [
    {
      id: "price",
      title: "3만 원 이하 상품 찾기",
      tables: ["Products"],
      requirements: [
        "가격(Price)이 30,000원 이하인 상품의 이름(Name)과 가격을 조회하세요.",
        "가격이 낮은 순서로 정렬하세요.",
      ],
      hint: "상품마다 가격표를 확인하며 예산 안에 드는 것만 장바구니에 담는다고 생각해 보세요. 정확히 3만 원인 상품도 포함합니다. 고른 상품의 이름과 가격을 보여주고, 가장 저렴한 상품부터 배치하세요.",
      answer:
        "SELECT Name, Price\nFROM dbo.Products\nWHERE Price <= 30000\nORDER BY Price;",
    },
    {
      id: "out-of-stock",
      title: "품절 상품 확인",
      tables: ["Products"],
      requirements: [
        "재고(Stock)가 0인 상품의 번호(ProductID), 이름, 재고를 조회하세요.",
        "상품 번호 순서로 정렬하세요.",
      ],
      hint: "상품 목록에서 남은 수량이 하나도 없는 행을 먼저 찾아보세요. 그 행의 상품 번호, 이름, 재고를 꺼내면 품절 목록이 됩니다. 마지막에 상품 번호 순서로 정리해 보세요.",
      answer:
        "SELECT ProductID, Name, Stock\nFROM dbo.Products\nWHERE Stock = 0\nORDER BY ProductID;",
    },
    {
      id: "seoul-customers",
      title: "서울 고객 목록",
      tables: ["Customers"],
      requirements: [
        "거주 도시(City)가 서울인 고객의 이름(Name)과 이메일(Email)을 조회하세요.",
        "고객 번호(CustomerID) 순서로 정렬하세요.",
      ],
      hint: "고객 주소록에서 도시가 서울인 사람에게만 표시를 한다고 생각해 보세요. 표시된 사람들의 이름과 이메일을 가져오면 됩니다. 고객 번호는 그 결과의 순서를 정할 때 사용하세요.",
      answer:
        "SELECT Name, Email\nFROM dbo.Customers\nWHERE City = N'서울'\nORDER BY CustomerID;",
    },
    {
      id: "category-average",
      title: "상품 분류별 평균 가격",
      tables: ["Products"],
      requirements: [
        "상품 분류(Category)별 평균 가격을 구하고 열 이름을 평균가격으로 지정하세요.",
        "평균 가격이 높은 분류부터 표시하세요.",
      ],
      hint: "같은 분류의 상품끼리 모은 뒤, 묶음마다 가격의 평균을 하나씩 구해 보세요. 결과 한 줄이 상품 분류 하나를 나타내도록 만들고, 계산한 평균이 큰 분류부터 정렬하면 됩니다.",
      answer:
        "SELECT Category, AVG(Price) AS 평균가격\nFROM dbo.Products\nGROUP BY Category\nORDER BY 평균가격 DESC;",
    },
    {
      id: "order-customer",
      title: "누가 주문했는지 확인하기",
      tables: ["Orders", "Customers"],
      requirements: [
        "주문 번호(OrderID), 주문한 고객의 이름(Name), 주문 상태(Status)를 조회하세요.",
        "고객 번호(CustomerID)로 연결하고 주문 번호 순서로 정렬하세요.",
      ],
      hint: "주문서에 적힌 고객 번호를 고객 명부에서 찾아 이름을 붙인다고 생각해 보세요. 고객 번호가 같은 행끼리 연결하면 주문 정보와 고객 이름을 한 줄에서 함께 꺼낼 수 있습니다. 주문 번호로 결과의 순서를 정하세요.",
      answer:
        "SELECT o.OrderID, c.Name, o.Status\nFROM dbo.Orders AS o\nJOIN dbo.Customers AS c ON o.CustomerID = c.CustomerID\nORDER BY o.OrderID;",
    },
    {
      id: "order-total",
      title: "주문별 결제 금액 계산",
      tables: ["OrderItems"],
      requirements: [
        "주문 번호(OrderID)별로 수량(Quantity) × 주문 당시 단가(UnitPrice)의 합계를 구하세요.",
        "합계 열 이름은 주문금액으로 지정하고 주문 번호 순서로 정렬하세요.",
      ],
      hint: "영수증을 계산하듯 상품 한 줄마다 수량과 당시 단가를 곱해 금액을 먼저 구해 보세요. 그런 다음 주문 번호가 같은 줄들의 금액을 모두 더하면 주문 한 건의 합계가 됩니다.",
      answer:
        "SELECT OrderID, SUM(Quantity * UnitPrice) AS 주문금액\nFROM dbo.OrderItems\nGROUP BY OrderID\nORDER BY OrderID;",
    },
    {
      id: "repeat-customer",
      title: "두 번 이상 주문한 고객",
      tables: ["Orders"],
      requirements: [
        "주문 상태와 관계없이 고객 번호별 주문 수를 집계하세요.",
        "주문이 2건 이상인 고객 번호(CustomerID)와 주문수만 표시하고 고객 번호 순서로 정렬하세요.",
      ],
      hint: "같은 고객의 주문서를 한데 모아 고객마다 몇 장인지 먼저 세어 보세요. 개수를 구한 다음 두 장 이상인 묶음만 남기면 됩니다. 이 문제에서는 주문 상태에 상관없이 취소된 주문도 함께 셉니다.",
      answer:
        "SELECT CustomerID, COUNT(*) AS 주문수\nFROM dbo.Orders\nGROUP BY CustomerID\nHAVING COUNT(*) >= 2\nORDER BY CustomerID;",
    },
    {
      id: "no-order",
      title: "아직 주문하지 않은 고객",
      tables: ["Customers", "Orders"],
      requirements: [
        "주문 내역이 없는 고객의 번호(CustomerID)와 이름(Name)을 조회하세요.",
        "고객 번호 순서로 정렬하세요.",
      ],
      hint: "고객 명부에서 한 사람씩 골라 그 고객 번호로 된 주문서가 있는지 찾아본다고 생각해 보세요. 일치하는 주문서가 하나도 없는 사람만 남기면 아직 주문하지 않은 고객 목록이 됩니다.",
      answer:
        "SELECT c.CustomerID, c.Name\nFROM dbo.Customers AS c\nWHERE NOT EXISTS (\n  SELECT 1 FROM dbo.Orders AS o WHERE o.CustomerID = c.CustomerID\n)\nORDER BY c.CustomerID;",
    },
  ]),
  ...define("campus", [
    {
      id: "english",
      title: "영어 고득점 학생 찾기",
      tables: ["exam"],
      requirements: [
        "영어 점수가 90점 이상인 학생의 성명과 영어 점수를 조회하세요.",
        "영어 점수가 높은 순서로 정렬하세요.",
      ],
      hint: "성적표에서 영어 점수를 보고 조건에 맞는 학생을 먼저 골라보세요. 90점인 학생도 포함한 뒤, 성명과 영어 점수만 보여줍니다. 가장 높은 점수가 맨 위에 오도록 순서를 정하면 됩니다.",
      answer:
        "SELECT 성명, 영어\nFROM dbo.exam\nWHERE 영어 >= 90\nORDER BY 영어 DESC;",
    },
    {
      id: "math-range",
      title: "수학 점수가 특정 범위인 학생",
      tables: ["exam"],
      requirements: [
        "수학 점수가 70점 이상 85점 이하인 학생의 성명과 수학 점수를 조회하세요.",
        "수학 점수가 높은 순서로 정렬하세요.",
      ],
      hint: "수학 점수에 아래쪽 경계와 위쪽 경계를 하나씩 둔다고 생각해 보세요. 두 경계를 모두 만족하는 학생만 남기며, 경계에 있는 70점과 85점도 포함합니다. 그다음 수학 점수가 높은 순서로 정리하세요.",
      answer:
        "SELECT 성명, 수학\nFROM dbo.exam\nWHERE 수학 BETWEEN 70 AND 85\nORDER BY 수학 DESC;",
    },
    {
      id: "missing-english",
      title: "영어 점수가 없는 학생",
      tables: ["exam"],
      requirements: [
        "영어 점수가 NULL인 학생의 성명과 학번을 조회하세요.",
        "학번 순서로 정렬하세요.",
      ],
      hint: "성적표에서 영어 점수가 아직 적히지 않은 칸을 찾아보세요. 0점도 기록된 점수이므로, 값 자체가 비어 있는 학생을 골라야 합니다. 그 학생들의 성명과 학번을 가져와 학번 순서로 정리하면 됩니다.",
      answer:
        "SELECT 성명, 학번\nFROM dbo.exam\nWHERE 영어 IS NULL\nORDER BY 학번;",
    },
    {
      id: "major-count",
      title: "전공별 학생 수",
      tables: ["Students"],
      requirements: [
        "전공(Major)별 학생 수를 구하고 열 이름을 학생수로 지정하세요.",
        "학생 수가 많은 순서로, 학생 수가 같으면 전공 이름 순서로 정렬하세요.",
      ],
      hint: "같은 전공의 학생끼리 모아 전공마다 몇 명인지 세어 보세요. 결과는 전공당 한 줄로 만들면 됩니다. 학생 수를 우선 비교하고, 그 수가 같은 경우에만 전공 이름으로 순서를 정하세요.",
      answer:
        "SELECT Major, COUNT(*) AS 학생수\nFROM dbo.Students\nGROUP BY Major\nORDER BY 학생수 DESC, Major;",
    },
    {
      id: "course-average",
      title: "강좌별 평균 성적",
      tables: ["Enrollments"],
      requirements: [
        "강좌 번호(CourseID)별 점수(Score)의 평균을 구하세요.",
        "열 이름을 평균점수로 지정하고 강좌 번호 순서로 정렬하세요. NULL 점수는 평균에서 제외합니다.",
      ],
      hint: "수강 기록을 강좌 번호별로 모은 뒤, 각 묶음에서 실제로 점수가 적힌 기록들만으로 평균을 구해 보세요. 점수가 비어 있는 기록은 합계와 나누는 인원수 양쪽에서 모두 빠져야 합니다.",
      answer:
        "SELECT CourseID, AVG(Score) AS 평균점수\nFROM dbo.Enrollments\nGROUP BY CourseID\nORDER BY CourseID;",
    },
    {
      id: "course-students",
      title: "데이터베이스 수강생 확인",
      tables: ["Students", "Enrollments"],
      requirements: [
        "강좌 번호(CourseID)가 101인 수강 기록의 학생 이름(Name)과 점수(Score)를 조회하세요.",
        "학생 번호(StudentID)로 연결하고 점수가 높은 순서로 정렬하세요.",
      ],
      hint: "수강 기록에서 원하는 강좌에 해당하는 행을 먼저 골라보세요. 그 기록의 학생 번호를 학생 명부에서 찾아 이름을 붙이면 이름과 점수를 함께 보여줄 수 있습니다. 마지막에는 점수가 높은 순서로 배치하세요.",
      answer:
        "SELECT s.Name, e.Score\nFROM dbo.Students AS s\nJOIN dbo.Enrollments AS e ON s.StudentID = e.StudentID\nWHERE e.CourseID = 101\nORDER BY e.Score DESC;",
    },
    {
      id: "course-title",
      title: "성적표에 강좌명 표시하기",
      tables: ["Courses", "Enrollments"],
      requirements: [
        "수강 기록마다 강좌 이름(Title), 학생 번호(StudentID), 점수(Score)를 조회하세요.",
        "강좌 번호(CourseID)로 연결하고 강좌 번호, 학생 번호 순서로 정렬하세요.",
      ],
      hint: "수강 기록 한 줄마다 적힌 강좌 번호를 강좌 목록에서 찾아 이름을 붙인다고 생각해 보세요. 각 기록의 학생 번호와 점수는 그대로 두고 강좌명만 함께 가져오면 됩니다. 정렬은 강좌 번호를 먼저, 학생 번호를 다음 기준으로 삼으세요.",
      answer:
        "SELECT c.Title, e.StudentID, e.Score\nFROM dbo.Courses AS c\nJOIN dbo.Enrollments AS e ON c.CourseID = e.CourseID\nORDER BY c.CourseID, e.StudentID;",
    },
    {
      id: "duplicate-name",
      title: "같은 이름의 응시자 찾기",
      tables: ["exam"],
      requirements: [
        "exam에서 같은 성명이 2번 이상 나오는 이름과 인원수를 조회하세요.",
        "인원수 열 이름을 지정하고 성명 순서로 정렬하세요.",
      ],
      hint: "이름이 같은 응시 기록끼리 모아 이름마다 몇 줄이 있는지 먼저 세어 보세요. 그 개수가 두 줄 이상인 묶음만 남기면 됩니다. 결과에는 이름과 그 이름으로 모인 기록 수를 한 줄씩 보여주세요.",
      answer:
        "SELECT 성명, COUNT(*) AS 인원수\nFROM dbo.exam\nGROUP BY 성명\nHAVING COUNT(*) >= 2\nORDER BY 성명;",
    },
  ]),
];

export function pickPracticeProblem(
  database,
  previousId,
  random = Math.random,
) {
  const pool = practiceProblems.filter(
    (problem) => problem.database === database,
  );
  const candidates = pool.filter((problem) => problem.id !== previousId);
  const choices = candidates.length ? candidates : pool;
  return choices.length ? choices[Math.floor(random() * choices.length)] : null;
}
