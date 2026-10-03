import { useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../lib/api";

const QUICK_QUESTIONS = [
  "What is Control Rate?",
  "What is ADV SRS?",
  "How should I read an ADV Fair Line?",
  "What does Matchup Conviction mean?",
];

function AskAdvAssistant() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
        body: JSON.stringify({ kind: "framework", question: nextQuestion }),
      });
      setResponse(payload);
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

  return <>
    {open && <aside className="ask-adv-assistant" aria-label="Ask ADV assistant">
      <div className="ask-adv-assistant-heading">
        <div><p className="eyebrow">CFP Advantage guide</p><h2>Ask ADV</h2></div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close Ask ADV">×</button>
      </div>
      <p>Ask what an ADV metric means or how to read the framework. Game-specific questions are available inside each matchup’s Full Breakdown.</p>
      <div className="ask-adv-quick-questions" aria-label="Suggested questions">
        {QUICK_QUESTIONS.map((item) => <button type="button" key={item} onClick={() => ask(item)} disabled={loading}>{item}</button>)}
      </div>
      <form className="ask-adv-assistant-form" onSubmit={submit}>
        <label htmlFor="ask-adv-site-question">Ask about CFP Advantage</label>
        <textarea id="ask-adv-site-question" value={question} maxLength={400} rows={3} onChange={(event) => setQuestion(event.target.value)} placeholder="What does Control Denial tell me?" />
        <button type="submit" disabled={loading || !question.trim()}>{loading ? "Thinking…" : "Ask ADV"}</button>
      </form>
      {error && <p className="status-line warn">{error}</p>}
      {response?.answer && <article className="ask-adv-assistant-answer"><strong>ADV says</strong><p>{response.answer}</p><small>{response.disclosure}</small></article>}
      <p className="ask-adv-assistant-links"><Link to="/metrics" onClick={() => setOpen(false)}>Open the Metrics Guide</Link><Link to="/matchups" onClick={() => setOpen(false)}>Explore matchups</Link></p>
    </aside>}
    <button className="ask-adv-launcher" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={open ? "Close Ask ADV" : "Open Ask ADV"}>
      <span aria-hidden="true">ADV</span><b>{open ? "Close" : "Ask ADV"}</b>
    </button>
  </>;
}

export default AskAdvAssistant;
