import Footer from "./Footer";
import Header from "./Header";
import AskAdvAssistant from "./AskAdvAssistant";

function StandardPage({ children, className = "" }) {
  return (
    <main className={`app-shell ${className}`.trim()}>
      <Header />
      {children}
      <Footer />
      <AskAdvAssistant />
    </main>
  );
}

export default StandardPage;
