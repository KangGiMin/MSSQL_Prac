import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { timing } from "../config/workbench";

export function useDatabaseConnection(databaseId) {
  const [health, setHealth] = useState(null);
  const generation = useRef(0);
  const [schema, setSchema] = useState([]);
  const [schemaLoading, setSchemaLoading] = useState(true);
  const [schemaError, setSchemaError] = useState("");
  const [schemaRevision, setSchemaRevision] = useState(0);
  const refreshSchema = () => setSchemaRevision((revision) => revision + 1);

  const refreshHealth = useCallback(async () => {
    const current = ++generation.current;
    try {
      const data = await api.health(databaseId);
      if (current === generation.current) setHealth(data);
    } catch (error) {
      if (current === generation.current)
        setHealth({ ...error.body, ok: false, error: error.message });
    }
  }, [databaseId]);

  useEffect(() => {
    setHealth(null);
    refreshHealth();
    const timer = setInterval(refreshHealth, timing.healthPollMs);
    return () => {
      clearInterval(timer);
      generation.current++;
    };
  }, [refreshHealth]);

  useEffect(() => {
    let live = true;
    setSchemaLoading(true);
    setSchemaError("");
    setSchema([]);
    api
      .schema(databaseId)
      .then((data) => {
        if (live) setSchema(data);
      })
      .catch((error) => {
        if (live) setSchemaError(error.message);
      })
      .finally(() => {
        if (live) setSchemaLoading(false);
      });
    return () => {
      live = false;
    };
  }, [databaseId, schemaRevision, health?.ok]);

  return {
    health,
    refreshHealth,
    schema,
    schemaLoading,
    schemaError,
    refreshSchema,
  };
}
