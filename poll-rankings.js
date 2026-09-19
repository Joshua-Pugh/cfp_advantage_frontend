(function () {
  "use strict";

  function badge(rank, poll = "AP Top 25") {
    const value = Number(rank);
    if (!Number.isInteger(value) || value < 1 || value > 25) return "";
    return `<span class="national-rank-badge" title="${poll}" aria-label="${poll} rank ${value}">No. ${value}</span>`;
  }

  window.CFPAdvantagePollRankings = Object.freeze({ badge });
})();
