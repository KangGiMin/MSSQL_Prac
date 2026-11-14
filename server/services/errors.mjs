export function httpError(message, status = 400, code) {
  return Object.assign(new Error(message), { status, code });
}

export function describeError(error) {
  const number = error.number || error.originalError?.info?.number;
  const code = error.code || error.originalError?.code;
  if (code === "ECANCEL")
    return "실행 요청을 취소했습니다. 이미 커밋된 변경은 유지됩니다.";
  if (code === "ETIMEOUT")
    return "실행 제한 시간을 초과했습니다. 조건을 좁히거나 쿼리를 나누어 실행해 주세요.";
  if (
    ["ELOGIN", "ESOCKET", "ECONNCLOSED", "EINSTLOOKUP"].includes(code) ||
    [4060, 18456].includes(number)
  ) {
    return "SQL Server 연결 또는 실습 DB 준비 상태를 확인해 주세요. 연결 설정을 확인한 뒤 DB 준비를 실행하세요.";
  }
  const messages = {
    102: "SQL 문법을 확인해 주세요.",
    207: "존재하지 않는 열 이름입니다.",
    208: "테이블이나 뷰를 찾을 수 없습니다. 선택 DB와 준비 SQL을 확인하세요.",
    229: "실습 사용자에게 허용되지 않은 작업입니다.",
    547: "외래 키 또는 CHECK 제약조건을 위반했습니다.",
    2601: "고유한 값이 중복되었습니다.",
    2627: "기본 키 또는 UNIQUE 값이 중복되었습니다.",
  };
  const raw = error.message || "요청을 처리하지 못했습니다.";
  const garbled = /\?{3,}/.test(raw);
  return messages[number]
    ? `${messages[number]}${garbled ? "" : ` ${raw}`}`
    : garbled
      ? `SQL Server가 요청을 처리하지 못했습니다.${number ? ` 오류 번호: ${number}.` : ""} 연결 및 실습 DB 준비 상태를 확인해 주세요.`
      : raw;
}
