export const defaultDatabaseId = "campus";

export const databases = [
  {
    id: "company",
    name: "QueryGround_Company",
    label: "회사 · 인사",
    subtitle: "사원과 부서 데이터로 배우는 SQL",
    icon: "building",
    color: "#38bdf8",
    tables: ["EMP", "DEPT", "SALGRADE", "BONUS"],
  },
  {
    id: "store",
    name: "QueryGround_Store",
    label: "온라인 스토어",
    subtitle: "고객 · 주문 · 상품을 연결해 보기",
    icon: "shopping",
    color: "#ffbe79",
    tables: [
      "Customers",
      "Products",
      "Orders",
      "OrderItems",
      "컵라면",
      "제조사",
    ],
  },
  {
    id: "campus",
    name: "QueryGround_Campus",
    label: "캠퍼스",
    subtitle: "학생 · 강좌 · 수강 이력 분석하기",
    icon: "graduation",
    color: "#8edec1",
    tables: ["Students", "Courses", "Enrollments", "exam", "exam_emp"],
  },
];
