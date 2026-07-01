import { describe, expect, it } from "vitest";

import { serviceLinks } from "./service-links";

describe("serviceLinks", () => {
  it("uses the externally published localhost ports from the Docker design", () => {
    expect(serviceLinks).toEqual([
      { label: "Frontend", href: "http://localhost:9112" },
      { label: "Backend API", href: "http://localhost:9113" },
      { label: "Grafana", href: "http://localhost:9114" },
      { label: "Prometheus", href: "http://localhost:9115" }
    ]);
  });
});
