import { databases } from '../../shared/databases.mjs';
export { databases };
export function getDatabase(id) {
  const db = databases.find(item => item.id === id);
  if (!db) { const error = new Error('등록된 실습 데이터베이스가 아닙니다.'); error.status = 400; throw error; }
  return db;
}
