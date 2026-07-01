export type ServiceLink = {
  label: string;
  href: string;
};

export const serviceLinks: ServiceLink[] = [
  { label: "Frontend", href: "http://localhost:9112" },
  { label: "Backend API", href: "http://localhost:9113" },
  { label: "Grafana", href: "http://localhost:9114" },
  { label: "Prometheus", href: "http://localhost:9115" }
];
