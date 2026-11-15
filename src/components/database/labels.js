export const practiceData = {
  company: { name: "직원 정보", description: "이름·부서·월급" },
  store: { name: "주문 정보", description: "고객·상품·주문" },
  campus: { name: "학생 성적", description: "학생·과목·점수" },
};

export const practiceLabel = (id) => practiceData[id]?.name || id;
