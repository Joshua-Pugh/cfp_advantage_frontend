const MAX_HISTORY_TURNS = 6;

function key(scope) {
  return `cfp-advantage.ask-adv.history.v1.${scope}`;
}

export function readAskAdvHistory(scope = "sitewide") {
  try {
    const value = JSON.parse(window.sessionStorage.getItem(key(scope)) || "[]");
    return Array.isArray(value) ? value.slice(-MAX_HISTORY_TURNS) : [];
  } catch {
    return [];
  }
}

export function appendAskAdvHistory(scope, current, question, response) {
  const next = [
    ...current,
    { role: "user", content: question, kind: response.kind },
    { role: "assistant", content: response.answer, kind: response.kind },
  ].slice(-MAX_HISTORY_TURNS);
  window.sessionStorage.setItem(key(scope), JSON.stringify(next));
  return next;
}

export function clearAskAdvHistory(scope = "sitewide") {
  window.sessionStorage.removeItem(key(scope));
}

