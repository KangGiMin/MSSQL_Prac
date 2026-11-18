import initSqlJs from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import company from "../../database/seeds/company.sql?raw";
import store from "../../database/seeds/store.sql?raw";
import campus from "../../database/seeds/campus.sql?raw";
import { createBrowserEngine } from "./engine.mjs";
import { loadDatabase, saveDatabase } from "./persistence.mjs";
const ready = initSqlJs({ locateFile: () => wasmUrl }).then((SQL) =>
  createBrowserEngine({
    SQL,
    seeds: { company, store, campus },
    load: loadDatabase,
    save: saveDatabase,
  }),
);
let queue = Promise.resolve();
self.onmessage = ({ data }) => {
  queue = queue.then(async () => {
    try {
      const engine = await ready;
      const value = await engine[data.operation](...data.args);
      self.postMessage({ id: data.id, value });
    } catch (error) {
      self.postMessage({
        id: data.id,
        error: { message: error.message, code: error.code },
      });
    }
  });
};
