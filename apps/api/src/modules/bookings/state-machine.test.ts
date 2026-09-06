import { describe, expect, it } from "vitest";

import { canTransition, TERMINAL_STATUSES } from "./state-machine.js";

describe("machine a etats de la reservation", () => {
  it("seul le loueur confirme ou refuse une demande ; seul le client (ou la plateforme) l'annule", () => {
    expect(canTransition("requested", "confirmed", "organization_member")).toBe(true);
    expect(canTransition("requested", "confirmed", "customer")).toBe(false);
    expect(canTransition("requested", "declined", "customer")).toBe(false);
    expect(canTransition("requested", "cancelled", "customer")).toBe(true);
    expect(canTransition("requested", "cancelled", "organization_member")).toBe(false);
    expect(canTransition("requested", "expired", "system")).toBe(true);
    expect(canTransition("requested", "expired", "customer")).toBe(false);
  });
  it("une reservation confirmee demarre, s'annule ou finit en no-show ; active elle se termine", () => {
    expect(canTransition("confirmed", "active", "organization_member")).toBe(true);
    expect(canTransition("confirmed", "completed", "organization_member")).toBe(false);
    expect(canTransition("active", "completed", "organization_member")).toBe(true);
    expect(canTransition("active", "cancelled", "customer")).toBe(false);
  });
  it("aucune transition ne sort d'un etat terminal", () => {
    for (const s of TERMINAL_STATUSES) {
      for (const to of ["requested", "confirmed", "active", "completed", "cancelled"] as const) {
        for (const actor of ["customer", "organization_member", "platform", "system"] as const)
          expect(canTransition(s, to, actor)).toBe(false);
      }
    }
  });
});
