import { shortConferenceTag } from "../lib/formatters";

export function PollRankTag({ ranking, rank }) {
  const value = rank ?? ranking?.rank;

  if (!value) return null;

  return (
    <span
      className="poll-rank-tag"
      title={`${ranking?.poll || "AP Top 25"} ranking`}
    >
      No. {value}
    </span>
  );
}

export function ConferenceTag({ conference }) {
  if (!conference) return null;

  return (
    <span className="matchup-conference-tag" title={conference}>
      {shortConferenceTag(conference)}
    </span>
  );
}

export default function TeamContextTags({ conference, ranking, rank }) {
  if (!conference && !(rank ?? ranking?.rank)) return null;

  return (
    <span className="team-context-tags">
      <PollRankTag ranking={ranking} rank={rank} />
      <ConferenceTag conference={conference} />
    </span>
  );
}
