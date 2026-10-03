import Footer from "./Footer";
import Header from "./Header";

function StandardPage({ children, className = "" }) {
  return (
    <main className={`app-shell ${className}`.trim()}>
      <Header />
      {children}
      <Footer />
    </main>
  );
}

export default StandardPage;
