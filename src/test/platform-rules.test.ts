import { describe, it, expect } from "vitest";
import { validateUpload, MAX_UPLOAD, safeCheckout } from "@/features/content";
describe("Protected platform rules", () => {
  it("rejects executables in the media library", () => {
    expect(
      validateUpload({ name: "malware.exe", size: 100, type: "application/octet-stream" }),
    ).toBe("Formato não permitido.");
  });
  it("accepts the required PDF format", () => {
    expect(validateUpload({ name: "ficha.pdf", size: 100, type: "application/pdf" })).toBe("");
  });
  it("accepts required MP4 videos", () => {
    expect(validateUpload({ name: "aula.mp4", size: 100, type: "video/mp4" })).toBe("");
  });
  it("accepts required images", () => {
    expect(validateUpload({ name: "foto.jpg", size: 100, type: "image/jpeg" })).toBe("");
  });
  it("accepts required spreadsheets", () => {
    expect(
      validateUpload({
        name: "custos.xlsx",
        size: 100,
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    ).toBe("");
  });
  it("enforces the declared 50 MB upload limit", () => {
    expect(MAX_UPLOAD).toBe(52428800);
    expect(validateUpload({ name: "aula.mp4", size: 52428801, type: "video/mp4" })).not.toBe("");
  });
  it("does not invent a checkout when it is unconfigured", () => {
    expect(safeCheckout("")).toBe("");
  });
  it("only opens HTTPS checkout URLs", () => {
    expect(safeCheckout("javascript:alert(1)")).toBe("");
    expect(safeCheckout("https://checkout.example.com/course")).toBe(
      "https://checkout.example.com/course",
    );
  });
});
