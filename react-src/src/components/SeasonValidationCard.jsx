import LoadingDots from "./LoadingDots";

function SeasonValidationCard({
  validation,
  validationError,
}) {
  return (
    <div className="season-card">
      <span>Product Status</span>
      <strong>Development Tracking</strong>

      <div
        className="home-validation-snapshot"
        aria-live="polite"
      >
        <div>
          <span>Published Picks</span>
          <b>{validation?.games_published ?? "-"}</b>
        </div>

        <div>
          <span>Winner Accuracy</span>
          <b>
            {validation
              ? validation.winner_accuracy == null
                ? "Pending"
                : `${(
                    Number(validation.winner_accuracy) * 100
                  ).toFixed(1)}%`
              : "-"}
          </b>
        </div>

        <div>
          <span>Margin MAE</span>
          <b>
            {validation
              ? validation.margin_mae == null
                ? "Pending"
                : Number(validation.margin_mae).toFixed(2)
              : "-"}
          </b>
        </div>

        <div>
          <span>Graded Picks</span>
          <b>{validation?.games_graded ?? "-"}</b>
        </div>
      </div>

      {!validation && !validationError ? (
        <small>
          <LoadingDots text="Loading certified record" />
        </small>
      ) : (
        <small>
          {validationError ||
            (Number(validation?.games_graded || 0) > 0
              ? "Receipts are preserved and updated after each certified grading run."
              : "Published before kickoff. Grading begins after certified finals.")}
        </small>
      )}
    </div>
  );
}

export default SeasonValidationCard;
