import { describe, it, expect } from "vitest";
import { validateUpload, MAX_UPLOAD, safeCheckout } from "@/features/content";
import { validateCommunityImage, COMMUNITY_IMAGE_MAX_BYTES } from "@/features/community.shared";
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
  it("accepts MP3 audio while enforcing the upload limit", () => {
    expect(validateUpload({ name: "ambiente.mp3", size: 100, type: "audio/mpeg" })).toBe("");
    expect(
      validateUpload({ name: "ambiente.mp3", size: MAX_UPLOAD + 1, type: "audio/mpeg" }),
    ).not.toBe("");
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
  it("accepts private community photos only in supported image formats and within 5 MB", () => {
    expect(validateCommunityImage({ type: "image/jpeg", size: 1024 })).toBe("");
    expect(validateCommunityImage({ type: "image/png", size: COMMUNITY_IMAGE_MAX_BYTES })).toBe("");
    expect(validateCommunityImage({ type: "image/gif", size: 1024 })).not.toBe("");
    expect(
      validateCommunityImage({ type: "image/webp", size: COMMUNITY_IMAGE_MAX_BYTES + 1 }),
    ).toBe("A foto pode ter no máximo 5 MB.");
  });
});
