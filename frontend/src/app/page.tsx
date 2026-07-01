import { serviceLinks } from "../lib/service-links";

export default function Home() {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <h1>MongoDB Admin Console</h1>
          <p>Stage 3 Docker scaffold for the admin, data, and monitoring services.</p>
        </div>
        <div className="status-pill">Docker-ready scaffold</div>
      </header>

      <section className="workspace" aria-label="Service overview">
        <div className="panel">
          <h2>Published services</h2>
          <div className="service-grid">
            {serviceLinks.map((service) => (
              <a className="service-link" href={service.href} key={service.href}>
                <strong>{service.label}</strong>
                <span>{service.href}</span>
              </a>
            ))}
          </div>
        </div>

        <aside className="panel">
          <h2>Runtime flow</h2>
          <div className="flow">
            <div className="flow-row">
              <strong>Frontend</strong>
              <span>Next.js container on port 9112</span>
            </div>
            <div className="flow-row">
              <strong>Backend</strong>
              <span>Spring Boot API and Prometheus metrics</span>
            </div>
            <div className="flow-row">
              <strong>MongoDB cluster</strong>
              <span>One admin database plus three collection databases</span>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
