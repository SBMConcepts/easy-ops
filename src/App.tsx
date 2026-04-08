import TopNavBar from "./components/TopNavBar";
import Hero from "./pages/Hero";
import Features from "./pages/Features";
import HowItWorks from "./pages/HowItWorks";
import Benefits from "./pages/Benefits";
import CTASection from "./pages/CTASection";
import Footer from "./components/Footer";
import "./App.css";

function App() {
  return (
    <>
      <TopNavBar />

      <main>
        <section id="home">
          <Hero />
        </section>
        <section id="features">
          <Features />
        </section>
        <section id="how-it-works">
          <HowItWorks />
        </section>
        <section id="benefits">
          <Benefits />
        </section>
        <section id="cta">
          <CTASection />
        </section>
      </main>

      <Footer />
    </>
  );
}

export default App;
