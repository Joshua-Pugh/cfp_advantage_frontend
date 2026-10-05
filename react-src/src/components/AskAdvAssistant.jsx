import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../lib/api";
import { appendAskAdvHistory, clearAskAdvHistory, readAskAdvHistory } from "../lib/askAdvHistory";

const QUICK_QUESTIONS = [
  "What is Control Rate?",
  "Who leads ADV SRS?",
  "How should I read an ADV Fair Line?",
  "What does Matchup Conviction mean?",
];
function AskAdvAssistant() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState(() => readAskAdvHistory("sitewide"));

  useEffect(() => {
    if (!open) return undefined;
    document.body.classList.add("ask-adv-open");
    function closeOnEscape(event) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.classList.remove("ask-adv-open");
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  async function ask(questionValue) {
    const nextQuestion = String(questionValue || question).trim();
    if (!nextQuestion || loading) return;
    setQuestion(nextQuestion);
    setLoading(true);
    setError("");
    try {
      const payload = await api("/api/ask-adv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "framework", season: 2026, question: nextQuestion, history }),
      });
      setResponse(payload);
      setHistory((current) => appendAskAdvHistory("sitewide", current, nextQuestion, payload));
    } catch (askError) {
      console.error("Ask ADV failed:", askError);
      setError("Ask ADV is temporarily unavailable. The Metrics Guide remains available below.");
    } finally {
      setLoading(false);
    }
  }

  function submit(event) {
    event.preventDefault();
    ask(question);
  }

  function clearConversation() {
    setHistory([]);
    setQuestion("");
    setResponse(null);
    setError("");
    clearAskAdvHistory("sitewide");
  }

  return <>
    {open && <aside className="ask-adv-assistant" aria-label="Ask ADV assistant">
      <div className="ask-adv-assistant-heading">
        <div><p className="eyebrow">CFP Advantage guide</p><h2>Ask ADV</h2></div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close Ask ADV">×</button>
      </div>
      <p>Ask about teams, rankings, ADV metrics, or how to read the framework. Ask a follow-up and ADV will remember the current conversation.</p>
      <div className="ask-adv-quick-questions" aria-label="Suggested questions">
        {QUICK_QUESTIONS.map((item) => <button type="button" key={item} onClick={() => ask(item)} disabled={loading}>{item}</button>)}
      </div>
      <form className="ask-adv-assistant-form" onSubmit={submit}>
        <label htmlFor="ask-adv-site-question">Ask about CFP Advantage</label>
        <textarea id="ask-adv-site-question" value={question} maxLength={400} rows={3} onChange={(event) => setQuestion(event.target.value)} placeholder="Who has the strongest ADV profile entering this week?" />
        <button type="submit" disabled={loading || !question.trim()}>{loading ? "Thinking…" : "Ask ADV"}</button>
      </form>
      {error && <p className="status-line warn">{error}</p>}
      {response?.answer && <article className={`ask-adv-assistant-answer ask-adv-answer-${response.kind || "general"}`}>
        <strong>{response.kind === "rankings" ? "ADV lookup" : "ADV says"}</strong>
        <p>{response.answer}</p>
        {response.key_points?.length > 0 && <ul>{response.key_points.map((point) => <li key={point}>{point}</li>)}</ul>}
        {response.uncertainty && <p className="ask-adv-uncertainty"><strong>What the data cannot settle:</strong> {response.uncertainty}</p>}
        <small>{response.disclosure}</small>
      </article>}
      <p className="ask-adv-assistant-links"><Link to="/metrics" onClick={() => setOpen(false)}>Open the Metrics Guide</Link><Link to="/matchups" onClick={() => setOpen(false)}>Explore matchups</Link>{history.length > 0 && <button type="button" onClick={clearConversation}>New conversation</button>}</p>
    </aside>}
    <button className="ask-adv-launcher" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={open ? "Close Ask ADV" : "Open Ask ADV"}>
      <span aria-hidden="true">ADV</span><b>{open ? "Close" : "Ask ADV"}</b>
    </button>
  </>;
}

export default AskAdvAssistant;
