import { describe, expect, it } from "vitest";
import { isAppointmentSlotConflictError } from "@/modules/appointments/infrastructure/appointment-db-conflicts";

describe("Appointment database conflict classification", () => {
  it("identifies the standard exclusion constraint error", () => {
    expect(isAppointmentSlotConflictError({ code: "23P01" })).toBe(true);
  });
  it("recognizes wrapped GiST exclusion deadlocks on appointments", () => {
    const deadlock = Object.assign(new Error("deadlock detected"), {
      code: "40P01",
      where: 'while checking exclusion constraint on tuple (15,4) in relation "appointments"',
    });
    const queryError = Object.assign(new Error("Failed query: insert into appointments"), {
      cause: deadlock,
    });
    expect(isAppointmentSlotConflictError(queryError)).toBe(true);
  });
  it("does not hide unrelated deadlocks as slot conflicts", () => {
    expect(isAppointmentSlotConflictError({
      code: "40P01",
      where: 'while updating relation "accounts"',
    })).toBe(false);
  });
  it("does not hide arbitrary database errors", () => {
    expect(isAppointmentSlotConflictError({ code: "23505", constraint: "unique_payment_ref" })).toBe(false);
    expect(isAppointmentSlotConflictError(new Error("connection refused"))).toBe(false);
  });
  it("recognizes named booking constraint even through a wrapper", () => {
    expect(isAppointmentSlotConflictError({ cause: { message: "appointments_no_double_booking" } })).toBe(true);
  });
});
