import { ChevronRight } from 'lucide-react';

export default function Onboarding({ onStart }) {
  return (
    <main className="onboarding-screen">
      <div className="onboarding-art" aria-hidden="true">
        <span className="art-ring" />
        <span className="art-zigzag art-zigzag-top" />
        <span className="art-zigzag art-zigzag-bottom" />
      </div>
      <section className="onboarding-copy">
        <p className="onboarding-kicker">A clearer week starts here</p>
        <h1>Manage What To Do</h1>
        <p className="onboarding-description">
          The best way to manage what you have to do. Keep your plans close and your next step
          clear.
        </p>
        <button className="onboarding-button" onClick={onStart} type="button">
          Get Started <ChevronRight size={17} />
        </button>
        <div className="onboarding-dots" aria-label="Introduction, step 1 of 1">
          <span />
        </div>
      </section>
    </main>
  );
}
