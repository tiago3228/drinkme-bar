import { describe, expect, it, vi } from "vitest";
import { signPublicImage } from "@/features/public-media";

describe("Controlled public photos", () => {
  it("signs explicitly public photos for one hour", async () => {
    const sign = vi.fn().mockResolvedValue("https://example.com/signed-photo");
    expect(await signPublicImage({ path: "photo.jpg", mime_type: "image/jpeg", is_public: true }, sign))
      .toBe("https://example.com/signed-photo");
    expect(sign).toHaveBeenCalledWith("photo.jpg", 3600);
  });
  it("never signs private course files", async () => {
    const sign = vi.fn();
    expect(await signPublicImage({ path: "private.jpg", mime_type: "image/jpeg", is_public: false }, sign)).toBeUndefined();
    expect(sign).not.toHaveBeenCalled();
  });
  it("never signs videos or documents as public site photos", async () => {
    const sign = vi.fn();
    for (const mime_type of ["video/mp4", "application/pdf", "image/svg+xml"]) {
      expect(await signPublicImage({ path: "file", mime_type, is_public: true }, sign)).toBeUndefined();
    }
    expect(sign).not.toHaveBeenCalled();
  });
  it("never signs missing resources", async () => {
    const sign = vi.fn();
    expect(await signPublicImage(null, sign)).toBeUndefined();
    expect(sign).not.toHaveBeenCalled();
  });
});