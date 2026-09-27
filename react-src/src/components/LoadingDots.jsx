function LoadingDots({ text = "Loading" }) {
  return (
    <span className="loading-indicator" role="status">
      <span>{text}</span>

      <span className="loading-dots" aria-hidden="true">
        <i></i>
        <i></i>
        <i></i>
      </span>
    </span>
  );
}

export default LoadingDots;
