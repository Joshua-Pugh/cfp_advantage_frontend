function numberOrNull(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

function whole(value) {
  const number = numberOrNull(value);

  return number === null
    ? "-"
    : Math.round(number).toLocaleString();
}

function decimal(value, digits = 1) {
  const number = numberOrNull(value);

  return number === null
    ? "-"
    : number.toFixed(digits);
}

function rate(value, digits = 1) {
  const number = numberOrNull(value);

  if (number === null) return "-";

  const pct =
    Math.abs(number) <= 1
      ? number * 100
      : number;

  return `${pct.toFixed(digits)}%`;
}

function percentWhole(value) {
  const number = numberOrNull(value);

  return number === null
    ? "-"
    : `${number.toFixed(1)}%`;
}

function signed(value) {
  const number = numberOrNull(value);

  if (number === null) return "-";

  return `${
    number > 0 ? "+" : ""
  }${Math.round(number)}`;
}

function pointsPerGame(points, games) {
  const pointTotal =
    numberOrNull(points);

  const gameTotal =
    numberOrNull(games);

  if (
    pointTotal === null ||
    gameTotal === null ||
    gameTotal <= 0
  ) {
    return "-";
  }

  return (
    pointTotal / gameTotal
  ).toFixed(1);
}

function conversion(
  made,
  attempts,
  storedRate
) {
  const madeNumber =
    numberOrNull(made);

  const attemptNumber =
    numberOrNull(attempts);

  const rateNumber =
    numberOrNull(storedRate);

  const pct =
    attemptNumber
      ? (madeNumber || 0) /
        attemptNumber
      : rateNumber;

  const countText =
    madeNumber !== null &&
    attemptNumber !== null
      ? `${whole(madeNumber)} / ${whole(
          attemptNumber
        )}`
      : "-";

  const pctText =
    pct === null
      ? "-"
      : rate(pct, 1);

  return `${countText} | ${pctText}`;
}

function fieldGoalLine(stats = {}) {
  const made =
    numberOrNull(
      stats.field_goals_made ??
      stats.field_goal_made ??
      stats.fg_made
    );

  const attempts =
    numberOrNull(
      stats.field_goal_attempts ??
      stats.field_goals_attempted ??
      stats.fg_attempts
    );

  const storedRate =
    numberOrNull(
      stats.field_goal_rate ??
      stats.field_goal_percentage ??
      stats.fg_percentage
    );

  const pct =
    attempts
      ? (made || 0) / attempts
      : storedRate;

  const countText =
    made !== null &&
    attempts !== null
      ? `${whole(made)} / ${whole(
          attempts
        )}`
      : null;

  const pctText =
    pct === null
      ? null
      : rate(pct, 1);

  if (countText && pctText) {
    return `${countText} | ${pctText}`;
  }

  if (countText) {
    return countText;
  }

  if (pctText) {
    return pctText;
  }

  return "-";
}

function hasValue(value) {
  return (
    value !== null &&
    value !== undefined &&
    value !== "" &&
    value !== "-"
  );
}

function StatSection({
  title,
  rows,
}) {
  const visibleRows =
    rows.filter(([, value]) =>
      hasValue(value)
    );

  if (!visibleRows.length) {
    return null;
  }

  return (
    <section className="team-stat-section">
      <div className="team-stat-section-heading">
        <h3>{title}</h3>
      </div>

      <div className="team-stat-grid">
        {visibleRows.map(
          ([label, value]) => (
            <div
              className="team-stat-item"
              key={label}
            >
              <span>{label}</span>

              <strong>
                {value}
              </strong>
            </div>
          )
        )}
      </div>
    </section>
  );
}

function TeamStats({
  intel = {},
  stats = {},
  games = [],
}) {
  const scoredGames =
    (
      Array.isArray(games)
        ? games
        : []
    ).filter(
      (game) =>
        Number.isFinite(
          Number(game.team_score)
        ) &&
        Number.isFinite(
          Number(
            game.opponent_score
          )
        )
    );

  const gamesPlayed =
    numberOrNull(stats.games) ||
    numberOrNull(intel.games) ||
    scoredGames.length ||
    null;

  const pointsFor =
    scoredGames.length
      ? scoredGames.reduce(
          (sum, game) =>
            sum +
            Number(
              game.team_score
            ),
          0
        )
      : numberOrNull(
          stats.drive_points
        );

  const pointsAgainst =
    scoredGames.length
      ? scoredGames.reduce(
          (sum, game) =>
            sum +
            Number(
              game.opponent_score
            ),
          0
        )
      : null;

  const passCompletions =
    numberOrNull(
      stats.pass_completions
    );

  const passAttempts =
    numberOrNull(
      stats.pass_attempts
    );

  const passCompletionPct =
    passCompletions !== null &&
    passAttempts
      ? (
          passCompletions /
          passAttempts
        ) * 100
      : null;

  const passingTds =
    numberOrNull(stats.pass_tds);

  const rushingTds =
    numberOrNull(stats.rush_tds);

  const totalTds =
    [
      passingTds,
      rushingTds,
    ].every(
      (value) => value === null
    )
      ? null
      : (passingTds || 0) +
        (rushingTds || 0);

  const giveawayCount =
    numberOrNull(
      stats.turnovers
    );

  const takeaways =
    numberOrNull(
      stats.takeaways
    );

  const turnoverMargin =
    numberOrNull(
      stats.turnover_margin
    );

  const defPassAllowed =
    numberOrNull(
      stats
        .def_pass_yards_allowed_per_game
    );

  const defRushAllowed =
    numberOrNull(
      stats
        .def_rush_yards_allowed_per_game
    );

  const defPassAllowedTotal =
    numberOrNull(
      stats
        .def_pass_yards_allowed
    );

  const defRushAllowedTotal =
    numberOrNull(
      stats
        .def_rush_yards_allowed
    );

  const totalAllowed =
    defPassAllowed !== null ||
    defRushAllowed !== null
      ? decimal(
          (defPassAllowed || 0) +
            (defRushAllowed || 0),
          1
        )
      : decimal(
          intel
            .yards_allowed_per_game,
          1
        );

  const totalDefensiveYardsAllowed =
    defPassAllowedTotal !== null ||
    defRushAllowedTotal !== null
      ? whole(
          (defPassAllowedTotal ||
            0) +
            (defRushAllowedTotal ||
              0)
        )
      : whole(
          intel
            .total_yards_allowed
        );

  const overviewRows = [
    [
      "Points Per Game",
      `${pointsPerGame(
        pointsFor,
        gamesPlayed
      )} scored / ${pointsPerGame(
        pointsAgainst,
        gamesPlayed
      )} allowed`,
    ],

    [
      "Total Points",
      whole(pointsFor),
    ],

    [
      "Yards Per Game",
      decimal(
        stats.yards_per_game,
        1
      ),
    ],

    [
      "Yards Per Play",
      decimal(
        stats.yards_per_play,
        2
      ),
    ],

    [
      "Points Per Drive",
      decimal(
        stats.points_per_drive,
        2
      ),
    ],

    [
      "Total Offensive Yards",
      whole(
        stats.total_yards ??
          intel.total_yards_for
      ),
    ],

    [
      "Total Defensive Yards Allowed",
      totalDefensiveYardsAllowed,
    ],

    [
      "Touchdowns",
      `Total ${whole(
        totalTds
      )} | Pass ${whole(
        passingTds
      )} | Rush ${whole(
        rushingTds
      )}`,
    ],

    [
      "First Downs Per Game",
      `Total ${decimal(
        stats
          .first_downs_per_game,
        1
      )} | Rush ${decimal(
        stats
          .rush_first_downs_per_game,
        1
      )} | Pass ${decimal(
        stats
          .pass_first_downs_per_game,
        1
      )}`,
    ],

    [
      "Possession Per Game",
      numberOrNull(
        stats
          .possession_minutes_per_game
      ) === null
        ? "-"
        : `${decimal(
            stats
              .possession_minutes_per_game,
            1
          )} min`,
    ],
  ];

  const passingRows = [
    [
      "Passing Yards Per Game",
      decimal(
        stats
          .pass_yards_per_game,
        1
      ),
    ],

    [
      "Completions / Attempts",
      `${whole(
        passCompletions
      )} / ${whole(
        passAttempts
      )}`,
    ],

    [
      "Completion Percentage",
      percentWhole(
        passCompletionPct
      ),
    ],

    [
      "Yards Per Pass Attempt",
      decimal(
        stats
          .yards_per_pass_attempt,
        2
      ),
    ],

    [
      "Passing Touchdowns",
      whole(passingTds),
    ],

    [
      "Interceptions Thrown",
      whole(
        stats
          .interceptions_thrown
      ),
    ],
  ];

  const rushingRows = [
    [
      "Rushing Yards Per Game",
      decimal(
        stats
          .rush_yards_per_game,
        1
      ),
    ],

    [
      "Rushing Attempts",
      whole(
        stats.rush_attempts
      ),
    ],

    [
      "Yards Per Rush",
      decimal(
        stats.yards_per_rush,
        2
      ),
    ],

    [
      "Rushing Touchdowns",
      whole(rushingTds),
    ],
  ];

  const defenseRows = [
    [
      "Yards Allowed Per Game",
      `Total ${totalAllowed} | Pass ${decimal(
        stats
          .def_pass_yards_allowed_per_game,
        1
      )} | Rush ${decimal(
        stats
          .def_rush_yards_allowed_per_game,
        1
      )}`,
    ],

    [
      "Sacks",
      whole(stats.sacks_made),
    ],

    [
      "Interceptions & Fumbles Recovered",
      `INT ${whole(
        stats
          .interceptions_made
      )} | Fumbles ${whole(
        stats
          .fumbles_recovered
      )}`,
    ],

    [
      "Tackles For Loss",
      whole(stats.tfl_made),
    ],
  ];

  const situationalRows = [
    [
      "3rd Down Conversions",
      conversion(
        stats
          .third_down_conversions,
        stats
          .third_down_attempts,
        stats.third_down_rate
      ),
    ],

    [
      "4th Down Conversions",
      conversion(
        stats
          .fourth_down_conversions,
        stats
          .fourth_down_attempts,
        stats.fourth_down_rate
      ),
    ],

    [
      "Red Zone Efficiency",
      `Score ${rate(
        stats
          .red_zone_score_rate
      )} | TD ${rate(
        stats.red_zone_td_rate
      )} | FG ${rate(
        stats.red_zone_fg_rate
      )} | Pts/Trip ${decimal(
        stats
          .red_zone_points_per_trip,
        2
      )}`,
    ],

    [
      "Turnover Margin",
      `Takeaways ${whole(
        takeaways
      )} | Giveaways ${whole(
        giveawayCount
      )} | Margin ${signed(
        turnoverMargin
      )}`,
    ],

    [
      "Field Goals",
      fieldGoalLine(stats),
    ],

    [
      "Punting Average",
      decimal(
        stats.punting_average,
        1
      ),
    ],

    [
      "Penalties / Penalty Yards",
      `${whole(
        stats.penalties
      )} penalties / ${whole(
        stats.penalty_yards
      )} yards`,
    ],

    [
      "Penalties Per Game",
      numberOrNull(
        stats.penalties_per_game
      ) === null
        ? "-"
        : `${decimal(
            stats
              .penalties_per_game,
            1
          )} penalties`,
    ],

    [
      "Penalty Yards Per Game",
      numberOrNull(
        stats
          .penalty_yards_per_game
      ) === null
        ? "-"
        : `${decimal(
            stats
              .penalty_yards_per_game,
            1
          )} yards`,
    ],
  ];

  return (
    <div className="team-stats-view">
      <div className="team-stats-intro">
        <p className="eyebrow">
          Traditional Statistics
        </p>

        <h3>
          Season Performance
        </h3>

        <p>
          Team-level production,
          efficiency, situational
          football, and special-teams
          output through the selected
          season.
        </p>
      </div>

      <StatSection
        title="Team Overview & Scoring"
        rows={overviewRows}
      />

      <StatSection
        title="Passing Statistics"
        rows={passingRows}
      />

      <StatSection
        title="Rushing Statistics"
        rows={rushingRows}
      />

      <StatSection
        title="Defensive & Line Metrics"
        rows={defenseRows}
      />

      <StatSection
        title="Situational & Special Teams"
        rows={situationalRows}
      />
    </div>
  );
}

export default TeamStats;
