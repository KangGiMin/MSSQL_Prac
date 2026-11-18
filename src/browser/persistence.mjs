let connection;
function open() {
  connection ||= new Promise((resolve, reject) => {
    const request = indexedDB.open("queryground-sql-databases", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("databases", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        new Error(
          "브라우저 DB 저장소를 열지 못했습니다. 사이트 저장 권한과 저장 공간을 확인해 주세요.",
        ),
      );
  });
  return connection;
}
export async function loadDatabase(id) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const request = db
      .transaction("databases")
      .objectStore("databases")
      .get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function saveDatabase(id, bytes, expectedRevision) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("databases", "readwrite"),
      store = transaction.objectStore("databases");
    let conflict = false;
    const read = store.get(id);
    read.onsuccess = () => {
      if ((read.result?.revision || 0) !== expectedRevision) {
        conflict = true;
        transaction.abort();
        return;
      }
      store.put({
        id,
        bytes: new Uint8Array(bytes),
        revision: expectedRevision + 1,
        updatedAt: Date.now(),
      });
    };
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(
        new Error("실습 DB를 저장하지 못했습니다. 저장 공간을 확인해 주세요."),
      );
    transaction.onabort = () =>
      reject(
        new Error(
          conflict
            ? "다른 탭에서 실습 DB가 바뀌었습니다. 결과를 확인한 뒤 다시 실행해 주세요."
            : "실습 DB 저장이 중단되었습니다.",
        ),
      );
  });
}
